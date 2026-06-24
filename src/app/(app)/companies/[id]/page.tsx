import { UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  companyStatusLabels,
  interactionTypeLabels,
  opportunityStatusLabels,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { deleteCompany } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, company] = await Promise.all([
    auth(),
    prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        contacts: { where: { deletedAt: null }, take: 10 },
        opportunities: { where: { deletedAt: null }, include: { service: true }, take: 10 },
        interactions: { where: { deletedAt: null }, orderBy: { date: "desc" }, take: 10 },
        tasks: {
          where: { deletedAt: null, status: "PENDING" },
          orderBy: { dueDate: "asc" },
          take: 10,
        },
        responsible: true,
      },
    }),
  ]);

  if (!company) {
    notFound();
  }
  const canEdit = session?.user.role !== UserRole.LECTURA;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Empresa</p>
            <h1 className="mt-1 text-2xl font-semibold">{company.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {company.industry ?? "Sin industria"} · {company.region ?? "Sin region"} · {companyStatusLabels[company.status]}
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/interactions/new?companyId=${company.id}`}>Interaccion</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/tasks/new?companyId=${company.id}`}>Tarea</Link>
                </Button>
              </>
            ) : null}
            {canEdit ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/companies/${company.id}/edit`}>Editar</Link>
                </Button>
                <form action={deleteCompany.bind(null, company.id)}>
                  <Button type="submit" variant="secondary">Eliminar</Button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Contactos</p>
          <p className="mt-2 text-2xl font-semibold">{company.contacts.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Oportunidades</p>
          <p className="mt-2 text-2xl font-semibold">{company.opportunities.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total ganado</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(company.totalWon.toString())}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Completitud</p>
          <p className="mt-2 text-2xl font-semibold">{company.completeness}%</p>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Contactos asociados</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {company.contacts.map((contact) => (
              <li key={contact.id}>
                <Link className="font-medium hover:underline" href={`/contacts/${contact.id}`}>
                  {contact.name}
                </Link>
                <span className="text-slate-500"> · {contact.email ?? "sin email"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Oportunidades asociadas</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {company.opportunities.map((opportunity) => (
              <li key={opportunity.id}>
                <Link className="font-medium hover:underline" href={`/opportunities/${opportunity.id}`}>
                  {opportunity.name}
                </Link>
                <span className="text-slate-500"> · {opportunityStatusLabels[opportunity.status]} · {opportunity.service?.name ?? "sin servicio"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Timeline comercial</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {company.interactions.map((interaction) => (
            <li key={interaction.id}>
              <span className="font-medium">{formatDate(interaction.date)}</span>
              <span className="text-slate-600"> · {interactionTypeLabels[interaction.type]} · {interaction.content}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Tareas pendientes</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {company.tasks.map((task) => (
            <li className="flex justify-between gap-4" key={task.id}>
              <span>{task.title}</span>
              <span className="shrink-0 text-slate-500">{formatDateTime(task.dueDate)}</span>
            </li>
          ))}
          {company.tasks.length === 0 ? <li className="text-slate-500">Sin tareas pendientes.</li> : null}
        </ul>
      </section>
    </div>
  );
}
