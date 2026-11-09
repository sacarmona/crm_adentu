import { OpportunityClosurePhase, OpportunityStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { authorizeProjectsRequest } from "@/server/projects-auth";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 500;

/**
 * Exporta oportunidades Cerradas - Ganadas para la app "ADENTU Proyectos".
 * Solo lectura. Por defecto excluye las Finalizadas; ?includeFinalized=1 las incluye.
 * ?updatedSince=<ISO 8601> permite sincronizacion incremental.
 */
export async function GET(request: NextRequest) {
  const unauthorized = authorizeProjectsRequest(request);
  if (unauthorized) return unauthorized;

  const params = request.nextUrl.searchParams;
  const includeFinalized = params.get("includeFinalized") === "1";
  const updatedSinceRaw = params.get("updatedSince");
  const updatedSince = updatedSinceRaw ? new Date(updatedSinceRaw) : null;

  if (updatedSince && Number.isNaN(updatedSince.getTime())) {
    return NextResponse.json(
      { error: "updatedSince debe ser una fecha ISO 8601 valida" },
      { status: 400 },
    );
  }

  const rows = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      status: OpportunityStatus.WON,
      ...(includeFinalized
        ? {}
        : { closurePhase: { not: OpportunityClosurePhase.FINALIZADA } }),
      ...(updatedSince ? { updatedAt: { gte: updatedSince } } : {}),
    },
    include: {
      company: { select: { id: true, name: true, industry: true, region: true } },
      primaryContact: {
        select: { id: true, name: true, email: true, phone: true, roleArea: true },
      },
      service: { select: { id: true, name: true } },
      responsible: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: MAX_ITEMS,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    includeFinalized,
    count: rows.length,
    items: rows.map((opportunity) => ({
      id: opportunity.id,
      name: opportunity.name,
      status: opportunity.status,
      closurePhase: opportunity.closurePhase,
      currency: opportunity.currency,
      exchangeRate: Number(opportunity.exchangeRate),
      // Montos en CLP: totalAmount = monthlyAmount x months
      monthlyAmount: Number(opportunity.monthlyAmount),
      months: opportunity.months,
      totalAmount: Number(opportunity.totalAmount),
      estimatedStartDate: opportunity.estimatedStartDate,
      estimatedCloseDate: opportunity.estimatedCloseDate,
      notes: opportunity.notes,
      updatedAt: opportunity.updatedAt,
      company: opportunity.company,
      contact: opportunity.primaryContact,
      service: opportunity.service,
      responsible: opportunity.responsible,
    })),
  });
}
