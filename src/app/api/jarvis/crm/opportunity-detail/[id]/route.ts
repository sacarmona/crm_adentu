import { NextRequest, NextResponse } from "next/server";

import { interactionTypeLabels, opportunityStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { authorizeJarvisRequest } from "@/server/jarvis-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = authorizeJarvisRequest(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const nParam = Number(searchParams.get("interactions"));
  const nInteractions =
    Number.isFinite(nParam) && nParam > 0 ? Math.min(nParam, 20) : 5;

  const opportunity = await prisma.opportunity.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: { select: { name: true, industry: true, region: true } },
      primaryContact: { select: { name: true, email: true, phone: true } },
      responsible: { select: { name: true, email: true } },
      service: { select: { name: true } },
      interactions: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        take: nInteractions,
        select: {
          id: true,
          date: true,
          type: true,
          content: true,
          nextAction: true,
          nextActionDate: true,
        },
      },
    },
  });

  if (!opportunity) {
    return NextResponse.json(
      { error: "Oportunidad no encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    app: "crm_adentu",
    metric: "opportunity_detail",
    asOf: new Date().toISOString(),
    opportunity: {
      id: opportunity.id,
      name: opportunity.name,
      status: opportunityStatusLabels[opportunity.status],
      company: opportunity.company?.name ?? null,
      industry: opportunity.company?.industry ?? null,
      region: opportunity.company?.region ?? null,
      contact: opportunity.primaryContact?.name ?? null,
      contactEmail: opportunity.primaryContact?.email ?? null,
      contactPhone: opportunity.primaryContact?.phone ?? null,
      responsible: opportunity.responsible?.name ?? null,
      service: opportunity.service?.name ?? null,
      totalAmount: Number(opportunity.totalAmount),
      weightedAmount: Number(opportunity.weightedAmount),
      currency: opportunity.currency,
      certainty: opportunity.certainty,
      estimatedCloseDate: opportunity.estimatedCloseDate?.toISOString() ?? null,
      estimatedStartDate: opportunity.estimatedStartDate?.toISOString() ?? null,
      nextActionDate: opportunity.nextActionDate?.toISOString() ?? null,
      lastInteraction: opportunity.lastInteraction?.toISOString() ?? null,
      notes: opportunity.notes ?? null,
    },
    interactions: opportunity.interactions.map((interaction) => ({
      id: interaction.id,
      date: interaction.date.toISOString(),
      type: interactionTypeLabels[interaction.type] ?? interaction.type,
      content: interaction.content,
      nextAction: interaction.nextAction ?? null,
      nextActionDate: interaction.nextActionDate?.toISOString() ?? null,
    })),
    summary: `Oportunidad "${opportunity.name}" en etapa ${opportunityStatusLabels[opportunity.status]}, con ${opportunity.interactions.length} interacciones recientes mostradas.`,
  });
}
