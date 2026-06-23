import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteOpportunity } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await prisma.opportunity.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: true,
      primaryContact: true,
      service: true,
      responsible: true,
      interactions: { where: { deletedAt: null }, orderBy: { date: "desc" }, take: 10 },
      tasks: { where: { deletedAt: null }, orderBy: { dueDate: "asc" }, take: 10 },
      aiInsights: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!opportunity) notFound();

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Oportunidad</p>
            <h1 className="mt-1 text-2xl font-semibold">{opportunity.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{opportunity.company?.name ?? "Sin empresa"} · {opportunity.service?.name ?? "Sin servicio"} · {opportunity.status}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/opportunities/${opportunity.id}/edit`}>Editar</Link></Button>
            <form action={deleteOpportunity.bind(null, opportunity.id)}><Button type="submit" variant="secondary">Eliminar</Button></form>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Monto total</p><p className="mt-2 text-xl font-semibold">{formatCurrency(opportunity.totalAmount.toString())}</p></div>
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Monto ponderado</p><p className="mt-2 text-xl font-semibold">{formatCurrency(opportunity.weightedAmount.toString())}</p></div>
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Probabilidad</p><p className="mt-2 text-xl font-semibold">{formatPercent(opportunity.probability.toString())}</p></div>
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Cierre estimado</p><p className="mt-2 text-xl font-semibold">{formatDate(opportunity.estimatedCloseDate)}</p></div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Calculos comerciales</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between"><dt>Precio CLP</dt><dd>{formatCurrency(opportunity.priceClp.toString())}</dd></div>
            <div className="flex justify-between"><dt>Monto mensual</dt><dd>{formatCurrency(opportunity.monthlyAmount.toString())}</dd></div>
            <div className="flex justify-between"><dt>Meses</dt><dd>{opportunity.months}</dd></div>
            <div className="flex justify-between"><dt>Cantidad</dt><dd>{opportunity.quantity}</dd></div>
          </dl>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Señales IA</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {opportunity.aiInsights.map((insight) => (
              <li key={insight.id}>{insight.summary ?? insight.type}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
