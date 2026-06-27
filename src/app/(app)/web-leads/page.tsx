import { WebLeadStatus } from "@prisma/client";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { convertWebLead, discardWebLead } from "@/server/actions/web-leads";

export const dynamic = "force-dynamic";

const labels: Record<WebLeadStatus, string> = { PENDING: "Pendiente", CONVERTED: "Convertido", DISCARDED: "Descartado" };

export default async function WebLeadsPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = Object.values(WebLeadStatus).includes(params?.status as WebLeadStatus) ? params?.status as WebLeadStatus : WebLeadStatus.PENDING;
  const [session, leads, companies, contacts, services] = await Promise.all([
    auth(),
    prisma.webLead.findMany({ where: { status }, include: { company: true, contact: true, opportunity: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.company.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.contact.findMany({ where: { deletedAt: null }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const canEdit = session?.user.role !== "LECTURA";

  return <div className="space-y-5">
    <EntityHeader title="Leads web" description="Revisa las consultas del sitio antes de crear contactos u oportunidades." />
    <form className="flex gap-3 rounded-md border border-slate-200 bg-white p-4">
      <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" defaultValue={status} name="status">
        {Object.values(WebLeadStatus).map((value) => <option key={value} value={value}>{labels[value]}</option>)}
      </select>
      <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">Filtrar</button>
    </form>
    <div className="space-y-4">
      {leads.map((lead) => <article className="rounded-md border border-slate-200 bg-white p-5" key={lead.id}>
        <div className="flex flex-col gap-3 md:flex-row md:justify-between">
          <div>
            <h2 className="font-semibold">{lead.subject || `Consulta de ${lead.name}`}</h2>
            <p className="mt-1 text-sm text-slate-600">{lead.name} - {lead.email}{lead.phone ? ` - ${lead.phone}` : ""}</p>
            <p className="mt-1 text-xs text-slate-500">{lead.companyName || "Sin empresa"} - {formatDateTime(lead.createdAt)}</p>
          </div>
          <span className="self-start rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{labels[lead.status]}</span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm">{lead.message}</p>
        {lead.sourcePage ? <a className="mt-3 block text-xs text-emerald-700 hover:underline" href={lead.sourcePage} rel="noreferrer" target="_blank">Ver pagina de origen</a> : null}
        {lead.status === "CONVERTED" ? <p className="mt-4 text-sm text-emerald-700">Convertido a {lead.opportunity?.name || lead.contact?.name || lead.company?.name}.</p> : null}
        {lead.status === "PENDING" && canEdit ? <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_auto]">
          <form action={convertWebLead.bind(null, lead.id)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="companyId"><option value="">Crear/usar empresa indicada</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={lead.companyName ?? ""} name="newCompanyName" placeholder="Nueva empresa" />
            <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="contactId"><option value="">Crear/usar contacto por email</option>{contacts.map((item) => <option key={item.id} value={item.id}>{item.name}{item.email ? ` - ${item.email}` : ""}</option>)}</select>
            <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={lead.name} name="newContactName" placeholder="Nombre contacto" />
            <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="serviceId"><option value="">Sin servicio</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <label className="flex h-10 items-center gap-2 text-sm"><input defaultChecked name="createOpportunity" type="checkbox" /> Crear oportunidad</label>
            <input className="h-10 rounded-md border border-slate-300 px-3 text-sm md:col-span-2" defaultValue={lead.subject || `Consulta web - ${lead.name}`} name="opportunityName" placeholder="Nombre oportunidad" />
            <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">Convertir lead</button>
          </form>
          <form action={discardWebLead.bind(null, lead.id)} className="flex gap-2">
            <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" name="reason" placeholder="Motivo opcional" />
            <button className="h-10 rounded-md border border-slate-300 px-4 text-sm">Descartar</button>
          </form>
        </div> : null}
      </article>)}
      {leads.length === 0 ? <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-slate-500">No hay leads en este estado.</div> : null}
    </div>
  </div>;
}
