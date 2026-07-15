import { NextRequest, NextResponse } from "next/server";
import type { OpportunityStatus } from "@prisma/client";

import { formatCurrency } from "@/lib/format";
import { opportunityStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { authorizeJarvisRequest } from "@/server/jarvis-auth";

export const dynamic = "force-dynamic";

const ADVANCED_STAGES: OpportunityStatus[] = ["PROPOSAL_SENT", "NEGOTIATION"];

export async function GET(request: NextRequest) {
  const unauthorized = authorizeJarvisRequest(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const daysParam = Number(searchParams.get("days"));
  const days =
    Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 60;

  const now = new Date();
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const opportunities = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      status: { in: ADVANCED_STAGES },
      estimatedCloseDate: { gte: now, lte: horizon },
    },
    include: {
      company: { select: { name: true } },
      responsible: { select: { name: true } },
    },
    orderBy: { estimatedCloseDate: "asc" },
    take: 50,
  });

  const items = opportunities.map((opportunity) => ({
    id: opportunity.id,
    name: opportunity.name,
    company: opportunity.company?.name ?? null,
    responsible: opportunity.responsible?.name ?? null,
    status: opportunityStatusLabels[opportunity.status],
    totalAmount: Number(opportunity.totalAmount),
    weightedAmount: Number(opportunity.weightedAmount),
    estimatedCloseDate: opportunity.estimatedCloseDate?.toISOString() ?? null,
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return NextResponse.json({
    app: "crm_adentu",
    metric: "upcoming_closures",
    asOf: now.toISOString(),
    daysHorizon: days,
    count: items.length,
    totalAmount,
    items,
    summary:
      items.length === 0
        ? `No hay oportunidades en etapas avanzadas con cierre estimado en los proximos ${days} dias.`
        : `${items.length} oportunidades en etapas avanzadas con cierre estimado en los proximos ${days} dias, por ${formatCurrency(totalAmount)} en monto total.`,
  });
}
