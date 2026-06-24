import { UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  contactStatusLabels,
  interactionTypeLabels,
  opportunityStatusLabels,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { deleteContact } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, contact] = await Promise.all([
    auth(),
    prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        responsible: true,
        primaryOpportunities: { where: { deletedAt: null }, include: { service: true }, take: 10 },
        interactions: { where: { deletedAt: null }, orderBy: { date: "desc" }, take: 10 },
        tasks: {
          where: { deletedAt: null, status: "PENDING" },
          orderBy: { dueDate: "asc" },
          take: 10,
        },
      },
    }),
  ]);

  if (!contact) notFound();
  const canEdit = session?.user.role !== UserRole.LECTURA;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Contacto</p>
            <h1 className="mt-1 text-2xl font-semibold">{contact.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{contact.company?.name ?? "Sin empresa"} · {contactStatusLabels[contact.status]}</p>
          </div>
          <div className="flex gap-2">
            {canEdit ? (
              <>
                <Button asChild variant="outline"><Link href={`/interactions/new?contactId=${contact.id}&companyId=${contact.companyId ?? ""}`}>Interaccion</Link></Button>
                <Button asChild variant="outline"><Link href={`/tasks/new?contactId=${contact.id}&companyId=${contact.companyId ?? ""}`}>Tarea</Link></Button>
              </>
            ) : null}
            {canEdit ? (
              <>
                <Button asChild variant="outline"><Link href={`/contacts/${contact.id}/edit`}>Editar</Link></Button>
                <form action={deleteContact.bind(null, contact.id)}><Button type="submit" variant="secondary">Eliminar</Button></form>
              </>
            ) : null}
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Email</p><p className="mt-2 text-sm font-medium">{contact.email ?? "-"}</p></div>
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Telefono</p><p className="mt-2 text-sm font-medium">{contact.phone ?? "-"}</p></div>
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Completitud</p><p className="mt-2 text-sm font-medium">{contact.completeness}%</p></div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Oportunidades asociadas</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {contact.primaryOpportunities.map((opportunity) => (
            <li key={opportunity.id}>
              <Link className="font-medium hover:underline" href={`/opportunities/${opportunity.id}`}>{opportunity.name}</Link>
              <span className="text-slate-500"> · {opportunityStatusLabels[opportunity.status]} · {opportunity.service?.name ?? "sin servicio"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Tareas pendientes</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {contact.tasks.map((task) => (
            <li className="flex justify-between gap-4" key={task.id}>
              <span>{task.title}</span>
              <span className="shrink-0 text-slate-500">{formatDateTime(task.dueDate)}</span>
            </li>
          ))}
          {contact.tasks.length === 0 ? <li className="text-slate-500">Sin tareas pendientes.</li> : null}
        </ul>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Interacciones</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {contact.interactions.map((interaction) => (
            <li key={interaction.id}><span className="font-medium">{formatDate(interaction.date)}</span><span className="text-slate-600"> · {interactionTypeLabels[interaction.type]} · {interaction.content}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
