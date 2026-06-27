import { CommercialDocumentStatus, CommercialDocumentType, Currency, UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CompletenessIndicator } from "@/components/crm/completeness-indicator";
import { PlaybookGuide } from "@/components/playbooks/playbook-guide";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "@/lib/format";
import {
  aiInsightTypeLabels,
  interactionTypeLabels,
  opportunityStatusLabels,
  commercialDocumentStatusLabels,
  commercialDocumentTypeLabels,
  currencyLabels,
  taskStatusLabels,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { deleteOpportunity } from "@/server/actions/crm";
import { createCommercialDocument, deleteCommercialDocument, updateCommercialDocumentStatus } from "@/server/actions/commercial-documents";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, opportunity] = await Promise.all([
    auth(),
    prisma.opportunity.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        primaryContact: true,
        responsible: true,
        interactions: { where: { deletedAt: null }, orderBy: { date: "desc" }, take: 10 },
        tasks: { where: { deletedAt: null }, orderBy: { dueDate: "asc" }, take: 10 },
        commercialDocuments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
        aiInsights: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 },
        service: {
          include: {
            playbooks: {
              where: { deletedAt: null, isActive: true },
              include: {
                items: {
                  where: { deletedAt: null },
                  orderBy: { sortOrder: "asc" },
                },
              },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  if (!opportunity) notFound();
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const isAdmin = session?.user.role === UserRole.ADMIN;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Oportunidad</p>
            <h1 className="mt-1 text-2xl font-semibold">{opportunity.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{opportunity.company?.name ?? "Sin empresa"} · {opportunity.service?.name ?? "Sin servicio"} · {opportunityStatusLabels[opportunity.status]}</p>
          </div>
          <div className="flex gap-2">
            <CompletenessIndicator score={opportunity.completeness} showLabel />
            {canEdit ? (
              <>
                <Button asChild variant="outline"><Link href={`/interactions/new?opportunityId=${opportunity.id}&companyId=${opportunity.companyId ?? ""}&contactId=${opportunity.primaryContactId ?? ""}`}>Interaccion</Link></Button>
                <Button asChild variant="outline"><Link href={`/tasks/new?opportunityId=${opportunity.id}&companyId=${opportunity.companyId ?? ""}&contactId=${opportunity.primaryContactId ?? ""}`}>Tarea</Link></Button>
              </>
            ) : null}
            {canEdit ? (
              <Button asChild variant="outline"><Link href={`/opportunities/${opportunity.id}/edit`}>Editar</Link></Button>
            ) : null}
            {isAdmin ? (
              <form action={deleteOpportunity.bind(null, opportunity.id)}><Button type="submit" variant="secondary">Eliminar</Button></form>
            ) : null}
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
            <div className="flex justify-between"><dt>Cantidad</dt><dd>{opportunity.quantity.toString()}</dd></div>
          </dl>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Señales IA</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {opportunity.aiInsights.map((insight) => (
              <li key={insight.id}>{insight.summary ?? aiInsightTypeLabels[insight.type]}</li>
            ))}
          </ul>
        </div>
      </section>
      {opportunity.service?.playbooks[0] ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Playbook · {opportunity.service.playbooks[0].name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Guia sugerida para {opportunity.service.name}
              </p>
            </div>
            <Link
              className="text-sm font-medium hover:underline"
              href={`/playbooks/${opportunity.service.playbooks[0].id}`}
            >
              Ver completo
            </Link>
          </div>
          <PlaybookGuide
            compact
            items={opportunity.service.playbooks[0].items}
          />
        </section>
      ) : null}
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div><h2 className="font-semibold">Documentos comerciales</h2><p className="mt-1 text-xs text-slate-500">Cotizaciones, propuestas y contratos vinculados a esta oportunidad.</p></div>
        </div>
        {canEdit ? <form action={createCommercialDocument} className="mt-4 grid gap-3 border-b border-slate-100 pb-5 md:grid-cols-2 xl:grid-cols-4">
          <input name="opportunityId" type="hidden" value={opportunity.id} />
          <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="type">{Object.values(CommercialDocumentType).map((value) => <option key={value} value={value}>{commercialDocumentTypeLabels[value]}</option>)}</select>
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="title" placeholder="Titulo del documento" required />
          <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue="DRAFT" name="status">{Object.values(CommercialDocumentStatus).map((value) => <option key={value} value={value}>{commercialDocumentStatusLabels[value]}</option>)}</select>
          <div className="grid grid-cols-[100px_1fr] gap-2"><select className="h-10 rounded-md border border-slate-300 px-2 text-sm" defaultValue={opportunity.currency} name="currency">{Object.values(Currency).map((value) => <option key={value} value={value}>{currencyLabels[value]}</option>)}</select><input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={opportunity.totalAmount.toString()} min="0" name="amount" placeholder="Monto" step="0.01" type="number" /></div>
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="validUntil" type="date" />
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="documentUrl" placeholder="Enlace Drive o documento" type="url" />
          <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="notes" placeholder="Notas" />
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">Agregar documento</button>
        </form> : null}
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Documento</th><th>Version</th><th>Estado</th><th>Monto</th><th>Vigencia</th><th>Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{opportunity.commercialDocuments.map((document) => <tr key={document.id}><td className="py-3 font-medium">{document.documentUrl ? <a className="hover:underline" href={document.documentUrl} rel="noreferrer" target="_blank">{document.title}</a> : document.title}<p className="text-xs font-normal text-slate-500">{commercialDocumentTypeLabels[document.type]}</p></td><td>v{document.version}</td><td>{canEdit ? <form action={updateCommercialDocumentStatus.bind(null, document.id)}><select className="h-9 rounded-md border border-slate-300 px-2 text-sm" defaultValue={document.status} name="status">{Object.values(CommercialDocumentStatus).map((value) => <option key={value} value={value}>{commercialDocumentStatusLabels[value]}</option>)}</select><button className="ml-2 text-xs font-medium">Guardar</button></form> : commercialDocumentStatusLabels[document.status]}</td><td>{formatCurrency(document.amount.toString(), document.currency)}</td><td>{formatDate(document.validUntil)}</td><td>{isAdmin ? <form action={deleteCommercialDocument.bind(null, document.id)}><button className="text-xs text-red-700">Eliminar</button></form> : null}</td></tr>)}{opportunity.commercialDocuments.length === 0 ? <tr><td className="py-6 text-center text-slate-500" colSpan={6}>Sin documentos comerciales.</td></tr> : null}</tbody></table></div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Interacciones recientes</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {opportunity.interactions.map((interaction) => (
              <li key={interaction.id}>
                <span className="font-medium">{formatDateTime(interaction.date)}</span>
                <span className="text-slate-600"> · {interactionTypeLabels[interaction.type]} · {interaction.content}</span>
              </li>
            ))}
            {opportunity.interactions.length === 0 ? <li className="text-slate-500">Sin interacciones.</li> : null}
          </ul>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Tareas</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {opportunity.tasks.map((task) => (
              <li className="flex justify-between gap-4" key={task.id}>
                <span>{task.title} · {taskStatusLabels[task.status]}</span>
                <span className="shrink-0 text-slate-500">{formatDateTime(task.dueDate)}</span>
              </li>
            ))}
            {opportunity.tasks.length === 0 ? <li className="text-slate-500">Sin tareas.</li> : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
