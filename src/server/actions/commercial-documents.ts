"use server";

import { AuditAction, CommercialDocumentStatus, CommercialDocumentType, Currency, OpportunityStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { nullableDate } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireWriter } from "@/server/authz";

const schema = z.object({
  opportunityId: z.string().uuid(),
  type: z.nativeEnum(CommercialDocumentType),
  status: z.nativeEnum(CommercialDocumentStatus),
  title: z.string().trim().min(3).max(240),
  currency: z.nativeEnum(Currency),
  amount: z.coerce.number().min(0),
  documentUrl: z.string().trim().optional().transform((v) => v || null).pipe(z.string().url().nullable()),
  validUntil: z.string().optional().transform((v) => v || null),
  notes: z.string().trim().optional().transform((v) => v || null),
});

export async function createCommercialDocument(formData: FormData) {
  const user = await requireWriter();
  const data = schema.parse(Object.fromEntries(formData.entries()));
  const latest = await prisma.commercialDocument.aggregate({ where: { opportunityId: data.opportunityId, type: data.type }, _max: { version: true } });
  const now = new Date();
  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.commercialDocument.create({
      data: {
        ...data,
        version: (latest._max.version ?? 0) + 1,
        validUntil: nullableDate(data.validUntil),
        sentAt: ["SENT", "VIEWED", "ACCEPTED"].includes(data.status) ? now : null,
        acceptedAt: data.status === "ACCEPTED" ? now : null,
        createdById: user.id,
      },
    });
    if (["SENT", "VIEWED", "ACCEPTED"].includes(data.status)) {
      await tx.interaction.create({ data: { type: "PROPOSAL_SENT", content: `${data.title} (version ${created.version}) - ${data.status}`, opportunityId: data.opportunityId, executedById: user.id } });
      await tx.opportunity.update({ where: { id: data.opportunityId }, data: { status: data.status === "ACCEPTED" ? OpportunityStatus.WON : OpportunityStatus.PROPOSAL_SENT, lastInteraction: now } });
    }
    await tx.auditLog.create({ data: { action: AuditAction.CREATE, entityType: "CommercialDocument", entityId: created.id, actorId: user.id, after: { title: created.title, type: created.type, version: created.version, status: created.status } } });
    return created;
  });
  revalidatePath(`/opportunities/${data.opportunityId}`);
  redirect(`/opportunities/${data.opportunityId}?document=${document.id}`);
}

export async function updateCommercialDocumentStatus(id: string, formData: FormData) {
  const user = await requireWriter();
  const status = z.nativeEnum(CommercialDocumentStatus).parse(formData.get("status"));
  const before = await prisma.commercialDocument.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new Error("El documento ya no esta disponible.");
  const now = new Date();
  await prisma.$transaction([
    prisma.commercialDocument.update({ where: { id }, data: { status, sentAt: status === "SENT" && !before.sentAt ? now : undefined, acceptedAt: status === "ACCEPTED" ? now : null } }),
    prisma.auditLog.create({ data: { action: AuditAction.UPDATE, entityType: "CommercialDocument", entityId: id, actorId: user.id, before: { status: before.status }, after: { status } } }),
  ]);
  revalidatePath(`/opportunities/${before.opportunityId}`);
}

export async function deleteCommercialDocument(id: string) {
  const user = await requireAdmin("Solo ADMIN puede eliminar documentos comerciales.");
  const document = await prisma.commercialDocument.update({ where: { id }, data: { deletedAt: new Date() } });
  await prisma.auditLog.create({ data: { action: AuditAction.SOFT_DELETE, entityType: "CommercialDocument", entityId: id, actorId: user.id } });
  revalidatePath(`/opportunities/${document.opportunityId}`);
}
