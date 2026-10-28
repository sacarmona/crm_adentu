import { ContactMedium, LeadStatus, UserRole } from "@prisma/client";
import { ArrowRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatDateTime } from "@/lib/format";
import { contactMediumLabels, leadStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  addLeadContact,
  convertLeadToOpportunity,
  deleteLead,
} from "@/server/actions/leads";

export const dynamic = "force-dynamic";

const statusStyles: Record<LeadStatus, string> = {
  NUEVO: "bg-sky-50 text-sky-700",
  CONTACTADO: "bg-amber-50 text-amber-700",
  CALIFICADO: "bg-violet-50 text-violet-700",
  CONVERTIDO: "bg-emerald-50 text-emerald-700",
  DESCARTADO: "bg-slate-100 text-slate-500",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const isAdmin = session?.user.role === UserRole.ADMIN;

  const lead = await prisma.lead.findFirst({
    where: { id, deletedAt: null },
    include: {
      contactLogs: { orderBy: { contactedAt: "desc" } },
    },
  });
  if (!lead) notFound();

  const responsible = lead.responsibleId
    ? await prisma.user.findUnique({ where: { id: lead.responsibleId }, select: { name: true } })
    : null;
  const isConverted = lead.status === LeadStatus.CONVERTIDO || Boolean(lead.convertedOpportunityId);

  return (
    <div className="space-y-5">
      <Button asChild className="w-fit" size="sm" variant="outline">
        <Link href="/leads">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver a leads
        </Link>
      </Button>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Lead</p>
            <h1 className="mt-1 text-2xl font-semibold">{lead.contactName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {lead.companyName ?? "Sin empresa"}
              {lead.email ? ` · ${lead.email}` : ""}
              {lead.phone ? ` · ${lead.phone}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className={`rounded-md px-2 py-1 font-semibold ${statusStyles[lead.status]}`}>
                {leadStatusLabels[lead.status]}
              </span>
              <span>Medio: {contactMediumLabels[lead.medium]}</span>
              <span>Ultimo contacto: {lead.lastContactAt ? formatDate(lead.lastContactAt) : "-"}</span>
              {responsible ? <span>Responsable: {responsible.name}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild variant="outline">
                <Link href={`/leads/${lead.id}/edit`}>Editar</Link>
              </Button>
            ) : null}
            {canEdit && !isConverted ? (
              <form action={convertLeadToOpportunity.bind(null, lead.id)}>
                <SubmitButton pendingLabel="Convirtiendo...">
                  Convertir a oportunidad
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </SubmitButton>
              </form>
            ) : null}
            {isConverted && lead.convertedOpportunityId ? (
              <Button asChild variant="outline">
                <Link href={`/opportunities/${lead.convertedOpportunityId}`}>Ver oportunidad</Link>
              </Button>
            ) : null}
            {isAdmin ? (
              <form action={deleteLead.bind(null, lead.id)}>
                <SubmitButton pendingLabel="Eliminando" variant="secondary">
                  Eliminar
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </div>
        {lead.notes ? (
          <p className="mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {lead.notes}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {canEdit ? (
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Registrar contacto</h2>
            <form action={addLeadContact.bind(null, lead.id)} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Medio</span>
                <select
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  defaultValue={lead.medium}
                  name="medium"
                >
                  {Object.values(ContactMedium).map((value) => (
                    <option key={value} value={value}>
                      {contactMediumLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Fecha</span>
                <input
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  name="contactedAt"
                  type="date"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Notas</span>
                <textarea
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  name="notes"
                  rows={3}
                />
              </label>
              <SubmitButton pendingLabel="Guardando...">Agregar al historial</SubmitButton>
            </form>
          </div>
        ) : null}

        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Historial de contactos ({lead.contactLogs.length})</h2>
          <ol className="mt-4 space-y-3">
            {lead.contactLogs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 border-l-2 border-slate-200 pl-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {contactMediumLabels[log.medium]}
                    </span>
                    <span className="text-slate-700">{formatDateTime(log.contactedAt)}</span>
                  </div>
                  {log.notes ? (
                    <p className="mt-1 text-sm text-slate-600">{log.notes}</p>
                  ) : null}
                </div>
              </li>
            ))}
            {lead.contactLogs.length === 0 ? (
              <li className="text-sm text-slate-500">Aun no hay contactos registrados.</li>
            ) : null}
          </ol>
        </div>
      </section>
    </div>
  );
}
