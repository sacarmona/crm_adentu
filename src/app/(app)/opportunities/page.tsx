import { OpportunityStatus, Prisma } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { Pagination } from "@/components/crm/pagination";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { followUpHealthLabels, opportunityStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  FOLLOW_UP_NORMAL_DAYS,
  FOLLOW_UP_STALLED_DAYS,
  FollowUpHealth,
  getFollowUpHealth,
} from "@/server/services/dashboard-metrics";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const closedStatuses = [OpportunityStatus.WON, OpportunityStatus.LOST];

function buildFollowUpWhere(
  followUp: FollowUpHealth | undefined,
): Prisma.OpportunityWhereInput | null {
  if (!followUp) return null;
  if (followUp === "closed") {
    return { status: { in: closedStatuses } };
  }

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const normalBoundary = new Date(now - FOLLOW_UP_NORMAL_DAYS * day);
  const stalledBoundary = new Date(now - FOLLOW_UP_STALLED_DAYS * day);
  const notClosed: Prisma.OpportunityWhereInput = {
    status: { notIn: closedStatuses },
  };
  const referenceGte = (boundary: Date): Prisma.OpportunityWhereInput => ({
    OR: [
      { lastInteraction: { gte: boundary } },
      { lastInteraction: null, createdAt: { gte: boundary } },
    ],
  });
  const referenceLt = (boundary: Date): Prisma.OpportunityWhereInput => ({
    OR: [
      { lastInteraction: { lt: boundary } },
      { lastInteraction: null, createdAt: { lt: boundary } },
    ],
  });

  if (followUp === "normal") {
    return { AND: [notClosed, referenceGte(normalBoundary)] };
  }
  if (followUp === "stalled") {
    return { AND: [notClosed, referenceLt(stalledBoundary)] };
  }
  return {
    AND: [notClosed, referenceLt(normalBoundary), referenceGte(stalledBoundary)],
  };
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    followUp?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const q = params?.q?.trim();
  const status = params?.status as OpportunityStatus | undefined;
  const followUp = ["normal", "watch", "stalled", "closed"].includes(
    params?.followUp ?? "",
  )
    ? (params?.followUp as FollowUpHealth)
    : undefined;
  const sort = params?.sort === "lastInteraction" ? "lastInteraction" : undefined;
  const dir = params?.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params?.page) || 1);
  const followUpWhere = buildFollowUpWhere(followUp);
  const conditions: Prisma.OpportunityWhereInput[] = [{ deletedAt: null }];
  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { company: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (status) conditions.push({ status });
  if (followUpWhere) conditions.push(followUpWhere);
  const where: Prisma.OpportunityWhereInput = { AND: conditions };
  const [opportunities, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: { company: true, service: true, responsible: true },
      orderBy: sort === "lastInteraction" ? { lastInteraction: dir } : { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.opportunity.count({ where }),
  ]);
  const sortHref = (field: string) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    if (followUp) qs.set("followUp", followUp);
    qs.set("sort", field);
    qs.set("dir", sort === field && dir === "desc" ? "asc" : "desc");
    return `/opportunities?${qs.toString()}`;
  };

  return (
    <div className="space-y-5">
      <EntityHeader
        actionHref={session?.user.role === "LECTURA" ? undefined : "/opportunities/new"}
        actionLabel={session?.user.role === "LECTURA" ? undefined : "Nueva oportunidad"}
        description="Gestiona pipeline, servicios, probabilidad y montos comerciales calculados."
        title="Oportunidades"
      />
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_200px_200px_auto]">
        <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={q} name="q" placeholder="Buscar oportunidad o empresa" />
        <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" defaultValue={status ?? ""} name="status">
          <option value="">Todos los estados</option>
          {Object.values(OpportunityStatus).map((value) => (
            <option key={value} value={value}>{opportunityStatusLabels[value]}</option>
          ))}
        </select>
        <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" defaultValue={followUp ?? ""} name="followUp">
          <option value="">Todo seguimiento</option>
          {(["normal", "watch", "stalled", "closed"] as const).map((value) => (
            <option key={value} value={value}>{followUpHealthLabels[value]}</option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">Filtrar</button>
      </form>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Oportunidad</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Prob.</th>
              <th className="px-4 py-3">Monto total</th>
              <th className="px-4 py-3">Seguimiento</th>
              <th className="px-4 py-3">
                <Link className="inline-flex items-center gap-1 hover:underline" href={sortHref("lastInteraction")}>
                  Ultima interaccion
                  {sort === "lastInteraction" ? (dir === "asc" ? " ↑" : " ↓") : null}
                </Link>
              </th>
              <th className="px-4 py-3">Cierre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {opportunities.map((opportunity) => {
              const health = getFollowUpHealth(opportunity);
              return (
                <tr key={opportunity.id}>
                  <td className="px-4 py-3 font-medium"><Link className="hover:underline" href={`/opportunities/${opportunity.id}`}>{opportunity.name}</Link></td>
                  <td className="px-4 py-3">{opportunity.company?.name ?? "-"}</td>
                  <td className="px-4 py-3">{opportunityStatusLabels[opportunity.status]}</td>
                  <td className="px-4 py-3">{formatPercent(opportunity.probability.toString())}</td>
                  <td className="px-4 py-3">{formatCurrency(opportunity.totalAmount.toString())}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        health.level === "stalled"
                          ? "bg-red-50 text-red-700"
                          : health.level === "watch"
                            ? "bg-amber-50 text-amber-700"
                            : health.level === "closed"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {followUpHealthLabels[health.level]}
                      {health.level === "closed" ? "" : ` · ${health.days}d`}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {opportunity.lastInteraction
                      ? formatDate(opportunity.lastInteraction)
                      : "Sin fecha"}
                  </td>
                  <td className="px-4 py-3">{formatDate(opportunity.estimatedCloseDate)}</td>
                </tr>
              );
            })}
            {opportunities.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={8}>No hay oportunidades para los filtros seleccionados.</td></tr>
            ) : null}
          </tbody>
        </table>
        <Pagination
          basePath="/opportunities"
          page={page}
          pageSize={PAGE_SIZE}
          params={{ q, status, followUp, sort, dir: sort ? dir : undefined }}
          total={total}
        />
      </section>
    </div>
  );
}
