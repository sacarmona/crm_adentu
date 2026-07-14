import { NextRequest, NextResponse } from "next/server";

import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { authorizeJarvisRequest } from "@/server/jarvis-auth";
import { calculateDashboardMetrics } from "@/server/services/dashboard-metrics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = authorizeJarvisRequest(request);
  if (unauthorized) return unauthorized;

  const now = new Date();
  const [opportunities, tasks] = await Promise.all([
    prisma.opportunity.findMany({
      where: { deletedAt: null },
      select: {
        status: true,
        totalAmount: true,
        weightedAmount: true,
        lastInteraction: true,
        createdAt: true,
      },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: { status: true, dueDate: true },
    }),
  ]);
  const metrics = calculateDashboardMetrics({
    now,
    opportunities: opportunities.map((opportunity) => ({
      status: opportunity.status,
      totalAmount: Number(opportunity.totalAmount),
      weightedAmount: Number(opportunity.weightedAmount),
      lastInteraction: opportunity.lastInteraction,
      createdAt: opportunity.createdAt,
    })),
    tasks,
  });

  return NextResponse.json({
    app: "crm_adentu",
    metric: "dashboard_summary",
    asOf: now.toISOString(),
    openPipelineAmount: metrics.openAmount,
    weightedPipelineAmount: metrics.weightedAmount,
    wonAmount: metrics.wonAmount,
    openOpportunities: metrics.openCount,
    overdueTasks: metrics.overdueTasks,
    upcomingTasks: metrics.upcomingTasks,
    dormantOpportunities: metrics.dormantOpportunities,
    summary: [
      `Pipeline abierto: ${formatCurrency(metrics.openAmount)}.`,
      `Pipeline ponderado: ${formatCurrency(metrics.weightedAmount)}.`,
      `${metrics.dormantOpportunities} oportunidades sin seguimiento por mas de 14 dias.`,
      `${metrics.overdueTasks} tareas vencidas.`,
    ].join(" "),
  });
}
