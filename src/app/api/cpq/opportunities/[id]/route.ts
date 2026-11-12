import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizeCpqRequest } from "@/server/cpq-auth";

export const dynamic = "force-dynamic";

/**
 * Entrega a "ADENTU CPQ" los datos de una oportunidad para armar una cotizacion.
 * Solo lectura, autenticada con Bearer CPQ_API_TOKEN.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = authorizeCpqRequest(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const opportunity = await prisma.opportunity.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: { select: { id: true, name: true, industry: true, region: true } },
      primaryContact: {
        select: { id: true, name: true, email: true, phone: true, roleArea: true },
      },
      service: { select: { id: true, name: true } },
      responsible: { select: { id: true, name: true, email: true } },
    },
  });

  if (!opportunity) {
    return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    id: opportunity.id,
    name: opportunity.name,
    status: opportunity.status,
    currency: opportunity.currency,
    exchangeRate: Number(opportunity.exchangeRate),
    price: Number(opportunity.price),
    priceClp: Number(opportunity.priceClp),
    quantity: Number(opportunity.quantity),
    months: opportunity.months,
    monthlyAmount: Number(opportunity.monthlyAmount),
    totalAmount: Number(opportunity.totalAmount),
    estimatedStartDate: opportunity.estimatedStartDate,
    estimatedCloseDate: opportunity.estimatedCloseDate,
    notes: opportunity.notes,
    updatedAt: opportunity.updatedAt,
    company: opportunity.company,
    contact: opportunity.primaryContact,
    service: opportunity.service,
    responsible: opportunity.responsible,
  });
}
