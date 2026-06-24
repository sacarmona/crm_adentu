import { OpportunityStatus } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { CompletenessIndicator } from "@/components/crm/completeness-indicator";
import { EntityHeader } from "@/components/crm/entity-header";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const q = params?.q?.trim();
  const status = params?.status as OpportunityStatus | undefined;
  const opportunities = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { company: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    },
    include: { company: true, service: true, responsible: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <EntityHeader
        actionHref={session?.user.role === "LECTURA" ? undefined : "/opportunities/new"}
        actionLabel={session?.user.role === "LECTURA" ? undefined : "Nueva oportunidad"}
        description="Gestiona pipeline, servicios, probabilidad y montos comerciales calculados."
        title="Oportunidades"
      />
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]">
        <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={q} name="q" placeholder="Buscar oportunidad o empresa" />
        <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" defaultValue={status ?? ""} name="status">
          <option value="">Todos los estados</option>
          {Object.values(OpportunityStatus).map((value) => (
            <option key={value} value={value}>{value}</option>
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
              <th className="px-4 py-3">Completitud</th>
              <th className="px-4 py-3">Cierre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {opportunities.map((opportunity) => (
              <tr key={opportunity.id}>
                <td className="px-4 py-3 font-medium"><Link className="hover:underline" href={`/opportunities/${opportunity.id}`}>{opportunity.name}</Link></td>
                <td className="px-4 py-3">{opportunity.company?.name ?? "-"}</td>
                <td className="px-4 py-3">{opportunity.status}</td>
                <td className="px-4 py-3">{formatPercent(opportunity.probability.toString())}</td>
                <td className="px-4 py-3">{formatCurrency(opportunity.totalAmount.toString())}</td>
                <td className="px-4 py-3"><CompletenessIndicator score={opportunity.completeness} /></td>
                <td className="px-4 py-3">{formatDate(opportunity.estimatedCloseDate)}</td>
              </tr>
            ))}
            {opportunities.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>No hay oportunidades para los filtros seleccionados.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
