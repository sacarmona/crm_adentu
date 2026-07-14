import { NextRequest, NextResponse } from "next/server";

import { formatCurrency } from "@/lib/format";
import { opportunityStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { authorizeJarvisRequest } from "@/server/jarvis-auth";
import { daysSince, openPipelineStatuses } from "@/server/services/dashboard-metrics";

export const dynamic = "force-dynamic";

const DAYS_THRESHOLD = 14;

export async function GET(request: NextRequest) {
  const unauthorized = authorizeJarvisRequest(request);
  if (unauthorized) return unauthorized;

  const now = new Date();
  const dormantBoundary = new Date(
    now.getTime() - DAYS_THRESHOLD * 24 * 60 * 60 * 1000,
  );

  const opportunities = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      status: { in: Array.from(openPipelineStatuses) },
      OR: [
        { lastInteraction: { lt: dormantBoundary } },
        { lastInteraction: null, createdAt: { lt: dormantBoundary } },
      ],
    },
    include: {
      company: { select: { name: true } },
      responsible: { select: { name: true } },
    },
    orderBy: [{ lastInteraction: "asc" }, { createdAt: "asc" }],
  });

  const items = opportunities.map((opportunity) => {
    const lastFollowUp = opportunity.lastInteraction ?? opportunity.createdAt;
    return {
      id: opportunity.id,
      name: opportunity.name,
      company: opportunity.company?.name ?? null,
      responsible: opportunity.responsible?.name ?? null,
      status: opportunityStatusLabels[opportunity.status],
      lastInteraction: opportunity.lastInteraction?.toISOString() ?? null,
      daysWithoutFollowUp: daysSince(lastFollowUp, now),
      totalAmount: Number(opportunity.totalAmount),
      weightedAmount: Number(opportunity.weightedAmount),
      nextActionDate: opportunity.nextActionDate?.toISOString() ?? null,
    };
  });
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const weightedAmount = items.reduce((sum, item) => sum + item.weightedAmount, 0);

  return NextResponse.json({
    app: "crm_adentu",
    metric: "dormant_opportunities",
    asOf: now.toISOString(),
    daysThreshold: DAYS_THRESHOLD,
    count: items.length,
    totalAmount,
    weightedAmount,
    items,
    summary:
      items.length === 0
        ? "No hay oportunidades sin seguimiento por mas de 14 dias."
        : `Hay ${items.length} oportunidades sin seguimiento por mas de 14 dias, por ${formatCurrency(totalAmount)} en monto total.`,
  });
}
