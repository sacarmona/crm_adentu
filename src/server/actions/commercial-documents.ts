"use server";

import { AuditAction, CommercialDocumentStatus, CommercialDocumentType, Currency, OpportunityStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { nullableDate } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireWriter } from "@/server/authz";
import { extractCommercialDocument } from "@/server/services/commercial-document-ai";
import { storeCommercialDocument } from "@/server/services/commercial-document-storage";
import { historicalClpRate } from "@/server/services/exchange-rates";
import { extractPdfText } from "@/server/services/linkedin-profile";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const optionalText = z.string().trim().optional().transform((value) => value || null);
const schema = z.object({
  opportunityId: z.string().uuid(),
  type: z.nativeEnum(CommercialDocumentType),
  status: z.nativeEnum(CommercialDocumentStatus),
  title: z.string().trim().min(3).max(240),
  documentNumber: optionalText,
  documentDate: optionalText,
  currency: z.nativeEnum(Currency),
  amount: z.coerce.number().min(0),
  exchangeRate: z.coerce.number().positive().default(1),
  documentUrl: optionalText.pipe(z.string().url().nullable()),
  validUntil: optionalText,
  notes: optionalText,
});

function amounts(amount: number, exchangeRate: number) {
  return { amount, exchangeRate, amountClp: Math.round(amount * exchangeRate * 100) / 100 };
}

export async function uploadAndAnalyzeCommercialDocument(formData: FormData) {
  const user = await requireWriter();
  const opportunityId = z.string().uuid().parse(formData.get("opportunityId"));
  const file = formData.get("documentFile");
  if (!(file instanceof File) || file.size === 0) throw new Error("Selecciona un archivo PDF.");
  if (file.type !== "application/pdf") throw new Error("El documento debe ser un PDF.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("El PDF supera los 10 MB permitidos.");

  const opportunity = await prisma.opportunity.findFirst({ where: { id: opportunityId, deletedAt: null } });
  if (!opportunity) throw new Error("La oportunidad ya no esta disponible.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(buffer);
  if (!text) throw new Error("El PDF no contiene texto extraible. Usa un PDF con OCR o ingreso manual.");

  const extraction = await extractCommercialDocument(text);
  const uploadedAt = new Date();
  const currency = extraction.currency ? Currency[extraction.currency] : opportunity.currency;
  const rateResult = await historicalClpRate(currency, uploadedAt).catch(() => null);
  const exchangeRate = rateResult?.rate ?? (currency === Currency.CLP ? 1 : opportunity.exchangeRate.toNumber());
  const amount = extraction.amount ?? 0;
  const uploaded = await storeCommercialDocument({ userId: user.id, opportunityName: opportunity.name, fileName: file.name, mimeType: file.type, data: buffer });
  const type = extraction.type ? CommercialDocumentType[extraction.type] : CommercialDocumentType.QUOTE;
  const latest = await prisma.commercialDocument.aggregate({ where: { opportunityId, type }, _max: { version: true } });
  const title = extraction.title || file.name.replace(/\.pdf$/i, "");

  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.commercialDocument.create({
      data: {
        opportunityId,
        type,
        status: CommercialDocumentStatus.DRAFT,
        title,
        version: (latest._max.version ?? 0) + 1,
        documentNumber: extraction.documentNumber,
        documentDate: nullableDate(extraction.documentDate),
        currency,
        ...amounts(amount, exchangeRate),
        exchangeRateDate: rateResult?.observedAt,
        exchangeRateSource: rateResult?.source,
        validUntil: nullableDate(extraction.validUntil),
        documentUrl: uploaded.webViewLink ?? uploaded.webContentLink,
        driveFileId: uploaded.id,
        fileName: file.name,
        mimeType: file.type,
        analysisSummary: extraction.summary,
        notes: !rateResult && currency !== Currency.CLP ? "Revisar tasa de cambio: no fue posible obtenerla automaticamente." : null,
        createdById: user.id,
      },
    });
    await tx.auditLog.create({ data: { action: AuditAction.IMPORT, entityType: "CommercialDocument", entityId: created.id, actorId: user.id, after: { fileName: file.name, extracted: extraction, exchangeRateSource: rateResult?.source } } });
    return created;
  });
  revalidatePath(`/opportunities/${opportunityId}`);
  redirect(`/opportunities/${opportunityId}?document=${document.id}`);
}

export async function createCommercialDocument(formData: FormData) {
  const user = await requireWriter();
  const data = schema.parse(Object.fromEntries(formData.entries()));
  const latest = await prisma.commercialDocument.aggregate({ where: { opportunityId: data.opportunityId, type: data.type }, _max: { version: true } });
  const now = new Date();
  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.commercialDocument.create({ data: { ...data, ...amounts(data.amount, data.exchangeRate), version: (latest._max.version ?? 0) + 1, documentDate: nullableDate(data.documentDate), validUntil: nullableDate(data.validUntil), sentAt: ["SENT", "VIEWED", "ACCEPTED"].includes(data.status) ? now : null, acceptedAt: data.status === "ACCEPTED" ? now : null, createdById: user.id } });
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

export async function updateCommercialDocument(id: string, formData: FormData) {
  const user = await requireWriter();
  const data = schema.omit({ opportunityId: true }).parse(Object.fromEntries(formData.entries()));
  const before = await prisma.commercialDocument.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new Error("El documento ya no esta disponible.");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.commercialDocument.update({ where: { id }, data: { ...data, ...amounts(data.amount, data.exchangeRate), documentDate: nullableDate(data.documentDate), validUntil: nullableDate(data.validUntil), sentAt: data.status === "SENT" && !before.sentAt ? now : undefined, acceptedAt: data.status === "ACCEPTED" ? now : null } });
    if (data.status !== before.status && ["SENT", "VIEWED", "ACCEPTED"].includes(data.status)) {
      await tx.interaction.create({ data: { type: "PROPOSAL_SENT", content: `${data.title} (version ${before.version}) - ${data.status}`, opportunityId: before.opportunityId, executedById: user.id } });
      await tx.opportunity.update({ where: { id: before.opportunityId }, data: { status: data.status === "ACCEPTED" ? OpportunityStatus.WON : OpportunityStatus.PROPOSAL_SENT, lastInteraction: now } });
    }
    await tx.auditLog.create({ data: { action: AuditAction.UPDATE, entityType: "CommercialDocument", entityId: id, actorId: user.id, before: { status: before.status, amount: before.amount.toString() }, after: { status: data.status, amount: data.amount, exchangeRate: data.exchangeRate } } });
  });
  revalidatePath(`/opportunities/${before.opportunityId}`);
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
