import { UserRole } from "@prisma/client";
import { Filter, Plus } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { MultiSelectFilter } from "@/components/crm/multi-select-filter";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { Button } from "@/components/ui/button";
import { followUpHealthLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { FollowUpHealth, getFollowUpHealth } from "@/server/services/dashboard-metrics";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{
    responsibleId?: string;
    serviceId?: string;
    followUp?: string | string[];
  }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const hasFilters = Boolean(
    params && ("responsibleId" in params || "serviceId" in params),
  );
  const responsibleId = hasFilters
    ? params?.responsibleId || undefined
    : session?.user.id;
  const serviceId = params?.serviceId || undefined;
  const followUpValues = (
    params?.followUp
      ? Array.isArray(params.followUp)
        ? params.followUp
        : [params.followUp]
      : []
  ).filter((value): value is FollowUpHealth =>
    ["normal", "watch", "stalled", "closed"].includes(value),
  );
  const canEdit =
    session?.user.role === UserRole.ADMIN ||
    session?.user.role === UserRole.COMERCIAL;

  const [opportunities, users, services] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        ...(responsibleId ? { responsibleId } : {}),
        ...(serviceId ? { serviceId } : {}),
      },
      include: { company: true, responsible: true, service: true },
      orderBy: [{ estimatedCloseDate: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const boardOpportunities = opportunities
    .map((opportunity) => ({
      id: opportunity.id,
      name: opportunity.name,
      status: opportunity.status,
      companyName: opportunity.company?.name ?? null,
      serviceName: opportunity.service?.name ?? null,
      responsibleName: opportunity.responsible?.name ?? null,
      probability: Number(opportunity.probability),
      totalAmount: Number(opportunity.totalAmount),
      weightedAmount: Number(opportunity.weightedAmount),
      followUp: getFollowUpHealth(opportunity),
      estimatedCloseDate: opportunity.estimatedCloseDate?.toISOString() ?? null,
    }))
    .filter(
      (opportunity) =>
        followUpValues.length === 0 || followUpValues.includes(opportunity.followUp.level),
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline comercial</h1>
          <p className="mt-1 text-sm text-slate-600">
            {canEdit
              ? "Mueve oportunidades entre etapas y revisa montos por columna."
              : "Vista de consulta del avance comercial y sus montos por etapa."}
          </p>
        </div>
        {canEdit ? (
          <Button asChild>
            <Link href="/opportunities/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva oportunidad
            </Link>
          </Button>
        ) : null}
      </div>

      <form className="grid gap-3 border-y border-slate-200 bg-white px-4 py-3 md:grid-cols-[220px_220px_220px_auto_1fr]">
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={responsibleId ?? ""}
          name="responsibleId"
        >
          <option value="">Todos los responsables</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={serviceId ?? ""}
          name="serviceId"
        >
          <option value="">Todos los servicios</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <MultiSelectFilter
          defaultValues={followUpValues}
          name="followUp"
          options={(["normal", "watch", "stalled", "closed"] as const).map((value) => ({
            value,
            label: followUpHealthLabels[value],
          }))}
          placeholder="Todo seguimiento"
        />
        <Button type="submit" variant="outline">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtrar
        </Button>
        <p className="self-center text-right text-xs text-slate-500">
          {boardOpportunities.length} oportunidades visibles
        </p>
      </form>

      <PipelineBoard
        canEdit={canEdit}
        initialOpportunities={boardOpportunities}
      />
    </div>
  );
}
