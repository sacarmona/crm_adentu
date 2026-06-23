import { InteractionType, UserRole } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; type?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const q = params?.q?.trim();
  const type = params?.type as InteractionType | undefined;
  const interactions = await prisma.interaction.findMany({
    where: {
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { content: { contains: q, mode: "insensitive" } },
              { company: { name: { contains: q, mode: "insensitive" } } },
              { contact: { name: { contains: q, mode: "insensitive" } } },
              { opportunity: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      company: true,
      contact: true,
      opportunity: true,
      executedBy: true,
      service: true,
    },
    orderBy: { date: "desc" },
    take: 100,
  });
  const canEdit = session?.user.role !== UserRole.LECTURA;

  return (
    <div className="space-y-5">
      <EntityHeader
        actionHref={canEdit ? "/interactions/new" : undefined}
        actionLabel={canEdit ? "Nueva interaccion" : undefined}
        description="Historial cronologico de reuniones, llamadas, mensajes, propuestas y seguimientos."
        title="Interacciones"
      />
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_240px_auto]">
        <input
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          defaultValue={q}
          name="q"
          placeholder="Buscar contenido, empresa, contacto u oportunidad"
        />
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={type ?? ""}
          name="type"
        >
          <option value="">Todos los tipos</option>
          {Object.values(InteractionType).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
          Filtrar
        </button>
      </form>
      <section className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white">
        {interactions.map((interaction) => (
          <article className="p-4" key={interaction.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{interaction.type}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(interaction.date)} ·{" "}
                  {interaction.executedBy?.name ?? "Sin ejecutor"}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {interaction.service?.name ?? "Sin servicio"}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {interaction.content}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {interaction.company ? (
                <Link
                  className="font-medium hover:underline"
                  href={`/companies/${interaction.company.id}`}
                >
                  {interaction.company.name}
                </Link>
              ) : null}
              {interaction.contact ? (
                <Link
                  className="font-medium hover:underline"
                  href={`/contacts/${interaction.contact.id}`}
                >
                  {interaction.contact.name}
                </Link>
              ) : null}
              {interaction.opportunity ? (
                <Link
                  className="font-medium hover:underline"
                  href={`/opportunities/${interaction.opportunity.id}`}
                >
                  {interaction.opportunity.name}
                </Link>
              ) : null}
            </div>
            {interaction.nextAction ? (
              <div className="mt-3 border-l-2 border-sky-300 pl-3 text-sm">
                <span className="font-medium">Proxima accion:</span>{" "}
                {interaction.nextAction} ·{" "}
                {formatDateTime(interaction.nextActionDate)}
              </div>
            ) : null}
          </article>
        ))}
        {interactions.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No hay interacciones para los filtros seleccionados.
          </p>
        ) : null}
      </section>
    </div>
  );
}
