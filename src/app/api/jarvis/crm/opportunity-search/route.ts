import { NextRequest, NextResponse } from "next/server";

import { opportunityStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { authorizeJarvisRequest } from "@/server/jarvis-auth";

export const dynamic = "force-dynamic";

const stageLabelToEnum = Object.fromEntries(
  Object.entries(opportunityStatusLabels).map(([enumValue, label]) => [
    label,
    enumValue,
  ]),
) as Record<string, keyof typeof opportunityStatusLabels>;

export async function GET(request: NextRequest) {
  const unauthorized = authorizeJarvisRequest(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = request.nextUrl;
  const text = searchParams.get("text")?.trim() || undefined;
  const stageLabel = searchParams.get("stage")?.trim() || undefined;
  const serviceName = searchParams.get("service")?.trim() || undefined;
  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 50)
      : 10;

  const status = stageLabel ? stageLabelToEnum[stageLabel] : undefined;
  if (stageLabel && !status) {
    return NextResponse.json(
      {
        error: `Etapa desconocida: "${stageLabel}". Valores validos: ${Object.keys(stageLabelToEnum).join(", ")}.`,
      },
      { status: 400 },
    );
  }

  let serviceId: string | undefined;
  if (serviceName) {
    const services = await prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });
    const match = services.find(
      (service) => service.name.toLowerCase() === serviceName.toLowerCase(),
    );
    if (!match) {
      return NextResponse.json(
        {
          error: `Servicio desconocido: "${serviceName}". Valores validos: ${services.map((s) => s.name).join(", ")}.`,
        },
        { status: 400 },
      );
    }
    serviceId = match.id;
  }

  const opportunities = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(serviceId ? { serviceId } : {}),
      ...(text
        ? {
            OR: [
              { name: { contains: text, mode: "insensitive" } },
              { company: { name: { contains: text, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      company: { select: { name: true } },
      primaryContact: { select: { name: true } },
      responsible: { select: { name: true } },
      service: { select: { name: true } },
    },
    orderBy: [{ estimatedCloseDate: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });

  const items = opportunities.map((opportunity) => ({
    id: opportunity.id,
    name: opportunity.name,
    company: opportunity.company?.name ?? null,
    contact: opportunity.primaryContact?.name ?? null,
    responsible: opportunity.responsible?.name ?? null,
    service: opportunity.service?.name ?? null,
    status: opportunityStatusLabels[opportunity.status],
    totalAmount: Number(opportunity.totalAmount),
    weightedAmount: Number(opportunity.weightedAmount),
    estimatedCloseDate: opportunity.estimatedCloseDate?.toISOString() ?? null,
    lastInteraction: opportunity.lastInteraction?.toISOString() ?? null,
  }));

  return NextResponse.json({
    app: "crm_adentu",
    metric: "opportunity_search",
    asOf: new Date().toISOString(),
    query: { text: text ?? null, stage: stageLabel ?? null, service: serviceName ?? null, limit },
    count: items.length,
    items,
    summary:
      items.length === 0
        ? "No se encontraron oportunidades con esos criterios."
        : `Se encontraron ${items.length} oportunidades.`,
  });
}
