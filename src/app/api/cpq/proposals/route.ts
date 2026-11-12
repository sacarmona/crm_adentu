import { AuditAction, CommercialDocumentStatus, CommercialDocumentType, Currency } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { authorizeCpqRequest } from "@/server/cpq-auth";

export const dynamic = "force-dynamic";

const isoDate = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value ? new Date(value) : null))
  .refine((date) => date === null || !Number.isNaN(date.getTime()), "Fecha invalida");

const bodySchema = z.object({
  opportunityId: z.string().uuid(),
  /** Codigo de la cotizacion en el CPQ (COT-AAAA-NNN): clave de idempotencia. */
  quoteCode: z.string().trim().min(3).max(60),
  title: z.string().trim().min(3).max(240),
  status: z.enum(["DRAFT", "ACCEPTED", "REJECTED", "CANCELLED"]),
  currency: z.nativeEnum(Currency),
  amount: z.number().min(0),
  exchangeRate: z.number().positive(),
  validUntil: isoDate,
  documentDate: isoDate,
  documentUrl: z.string().url().nullable().optional(),
  analysisSummary: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

/**
 * Recibe de "ADENTU CPQ" la propuesta preliminar de una oportunidad y la registra como
 * documento comercial (tipo PROPUESTA). Es idempotente por (oportunidad, quoteCode): reenviar
 * actualiza el mismo documento. No cambia la etapa de la oportunidad.
 */
export async function POST(request: NextRequest) {
  const unauthorized = authorizeCpqRequest(request);
  if (unauthorized) return unauthorized;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const opportunity = await prisma.opportunity.findFirst({ where: { id: data.opportunityId, deletedAt: null }, select: { id: true } });
  if (!opportunity) {
    return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
  }

  const status = CommercialDocumentStatus[data.status];
  const now = new Date();
  const amountClp = Math.round(data.amount * data.exchangeRate * 100) / 100;
  const fields = {
    status,
    title: data.title,
    currency: data.currency,
    amount: data.amount,
    exchangeRate: data.exchangeRate,
    amountClp,
    exchangeRateDate: data.documentDate ?? now,
    exchangeRateSource: "CPQ",
    documentDate: data.documentDate ?? now,
    validUntil: data.validUntil,
    documentUrl: data.documentUrl ?? null,
    analysisSummary: data.analysisSummary ?? null,
    notes: data.notes ?? null,
    acceptedAt: status === CommercialDocumentStatus.ACCEPTED ? now : null,
  };

  const existing = await prisma.commercialDocument.findFirst({
    where: {
      opportunityId: data.opportunityId,
      type: CommercialDocumentType.PROPOSAL,
      documentNumber: data.quoteCode,
      deletedAt: null,
    },
  });

  if (existing) {
    // Un reenvio de la propuesta en borrador no debe retroceder el estado que ya avanzo en el CRM
    // (p. ej. Enviada); solo los estados finales del CPQ (aprobada, rechazada, anulada) se aplican.
    const { status: incomingStatus, ...rest } = fields;
    const updateData = incomingStatus === CommercialDocumentStatus.DRAFT ? rest : fields;
    await prisma.$transaction([
      prisma.commercialDocument.update({ where: { id: existing.id }, data: updateData }),
      prisma.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          entityType: "CommercialDocument",
          entityId: existing.id,
          before: { status: existing.status, amount: existing.amount.toString() },
          after: { status: data.status, amount: data.amount, source: "CPQ" },
        },
      }),
    ]);
    return NextResponse.json({ documentId: existing.id, version: existing.version, created: false });
  }

  const latest = await prisma.commercialDocument.aggregate({
    where: { opportunityId: data.opportunityId, type: CommercialDocumentType.PROPOSAL },
    _max: { version: true },
  });
  const created = await prisma.$transaction(async (tx) => {
    const doc = await tx.commercialDocument.create({
      data: {
        ...fields,
        opportunityId: data.opportunityId,
        type: CommercialDocumentType.PROPOSAL,
        documentNumber: data.quoteCode,
        version: (latest._max.version ?? 0) + 1,
      },
    });
    await tx.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "CommercialDocument",
        entityId: doc.id,
        after: { title: doc.title, type: doc.type, version: doc.version, status: doc.status, source: "CPQ" },
      },
    });
    return doc;
  });
  return NextResponse.json({ documentId: created.id, version: created.version, created: true }, { status: 201 });
}
