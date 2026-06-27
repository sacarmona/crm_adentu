"use server";

import { AuditAction, CompanyStatus, ContactStatus, LeadSource, OpportunityStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { normalizeName } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/server/authz";

const optionalId = z.string().uuid().or(z.literal("")).transform((value) => value || null);
const conversionSchema = z.object({
  companyId: optionalId,
  newCompanyName: z.string().trim().max(200).optional(),
  contactId: optionalId,
  newContactName: z.string().trim().max(160).optional(),
  createOpportunity: z.string().optional(),
  opportunityName: z.string().trim().max(240).optional(),
  serviceId: optionalId,
});

export async function convertWebLead(id: string, formData: FormData) {
  const user = await requireWriter();
  const lead = await prisma.webLead.findUnique({ where: { id } });
  if (!lead || lead.status !== "PENDING") throw new Error("El lead ya no esta pendiente.");
  const data = conversionSchema.parse(Object.fromEntries(formData.entries()));

  const result = await prisma.$transaction(async (tx) => {
    let companyId = data.companyId;
    if (!companyId && (data.newCompanyName || lead.companyName)) {
      const name = data.newCompanyName || lead.companyName!;
      const company = await tx.company.create({ data: { name, normalizedName: normalizeName(name), status: CompanyStatus.UNQUALIFIED, responsibleId: user.id, notes: `Origen: formulario web${lead.sourcePage ? ` (${lead.sourcePage})` : ""}` } });
      companyId = company.id;
    }

    let contactId = data.contactId;
    if (!contactId) contactId = (await tx.contact.findFirst({ where: { email: { equals: lead.email, mode: "insensitive" }, deletedAt: null } }))?.id ?? null;
    if (!contactId) {
      const contact = await tx.contact.create({ data: { name: data.newContactName || lead.name, email: lead.email, phone: lead.phone, roleArea: lead.roleArea, companyId, status: ContactStatus.UNQUALIFIED, leadSource: LeadSource.INBOUND_OTHER, responsibleId: user.id, notes: lead.message } });
      contactId = contact.id;
    }

    let opportunityId: string | null = null;
    if (data.createOpportunity === "on") {
      const opportunity = await tx.opportunity.create({ data: { name: data.opportunityName || lead.subject || `Consulta web - ${lead.name}`, companyId, primaryContactId: contactId, serviceId: data.serviceId, status: OpportunityStatus.EXPLORATION, responsibleId: user.id, notes: lead.message, lastInteraction: lead.createdAt } });
      opportunityId = opportunity.id;
      await tx.interaction.create({ data: { date: lead.createdAt, type: "OTHER", content: `Consulta recibida desde formulario web: ${lead.message}`, companyId, contactId, opportunityId, serviceId: data.serviceId, executedById: user.id } });
    }

    await tx.webLead.update({ where: { id }, data: { status: "CONVERTED", companyId, contactId, opportunityId, reviewedById: user.id, reviewedAt: new Date() } });
    await tx.auditLog.create({ data: { action: AuditAction.IMPORT, entityType: "WebLead", entityId: id, actorId: user.id, after: { companyId, contactId, opportunityId } } });
    return { opportunityId };
  });

  revalidatePath("/web-leads");
  redirect(result.opportunityId ? `/opportunities/${result.opportunityId}` : "/web-leads");
}

export async function discardWebLead(id: string, formData: FormData) {
  const user = await requireWriter();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  await prisma.$transaction([
    prisma.webLead.update({ where: { id }, data: { status: "DISCARDED", discardReason: reason, reviewedById: user.id, reviewedAt: new Date() } }),
    prisma.auditLog.create({ data: { action: AuditAction.SOFT_DELETE, entityType: "WebLead", entityId: id, actorId: user.id, after: { reason } } }),
  ]);
  revalidatePath("/web-leads");
}
