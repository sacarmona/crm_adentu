import { InteractionType, UserRole } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { Pagination } from "@/components/crm/pagination";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { interactionTypeLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { deleteInteraction } from "@/server/actions/activity";
import { analyzeInteraction } from "@/server/actions/intelligence";
import { isAiConfigured } from "@/server/services/openai";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    serviceId?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const q = params?.q?.trim();
  const type = params?.type as InteractionType | undefined;
  const serviceId = params?.serviceId;
  const page = Math.max(1, Number(params?.page) || 1);
  const where = {
    deletedAt: null,
    ...(type ? { type } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(q
      ? {
          OR: [
            { content: { contains: q, mode: "insensitive" as const } },
            { company: { name: { contains: q, mode: "insensitive" as const } } },
            { contact: { name: { contains: q, mode: "insensitive" as const } } },
            { opportunity: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [interactions, total, services] = await Promise.all([
    prisma.interaction.findMany({
      where,
      include: {
        company: true,
        contact: true,
        opportunity: true,
        executedBy: true,
        service: true,
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.interaction.count({ where }),
    prisma.service.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const canAnalyze = canEdit && isAiConfigured();
  const isAdmin = session?.user.role === UserRole.ADMIN;
  const showActionsColumn = canEdit || isAdmin;

  return (
    <div className="space-y-5">
      <EntityHeader
        actionHref={canEdit ? "/interactions/new" : undefined}
        actionLabel={canEdit ? "Nueva interaccion" : undefined}
        description="Historial cronologico de reuniones, llamadas, mensajes, propuestas y seguimientos."
        title="Interacciones"
      />
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_200px_200px_auto]">
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
              {interactionTypeLabels[value]}
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
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
          Filtrar
        </button>
      </form>
      <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {showActionsColumn ? <th className="px-3 py-2">Acciones</th> : null}
              <th className="px-3 py-2">Fecha</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Empresa</th>
              <th className="px-4 py-2">Contacto</th>
              <th className="px-4 py-2">Oportunidad</th>
              <th className="px-4 py-2">Servicio</th>
              <th className="px-4 py-2">Ejecuto</th>
              <th className="px-4 py-2">Contenido</th>
              <th className="px-4 py-2">Proxima accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {interactions.map((interaction) => (
              <tr key={interaction.id}>
                {showActionsColumn ? (
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {canEdit ? (
                        <Button asChild className="h-7 px-2 text-xs" size="sm" variant="outline">
                          <Link href={`/interactions/${interaction.id}/edit`}>
                            Editar
                          </Link>
                        </Button>
                      ) : null}
                      {canAnalyze ? (
                        <form action={analyzeInteraction.bind(null, interaction.id)}>
                          <Button className="h-7 px-2 text-xs" size="sm" type="submit" variant="outline">
                            Analizar con IA
                          </Button>
                        </form>
                      ) : null}
                      {isAdmin ? (
                        <form action={deleteInteraction.bind(null, interaction.id)}>
                          <Button className="h-7 px-2 text-xs" size="sm" type="submit" variant="secondary">
                            Eliminar
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                ) : null}
                <td className="px-3 py-2 align-top text-xs text-slate-500">
                  <div className="leading-tight">
                    <div className="font-medium text-slate-700">{formatDate(interaction.date)}</div>
                    <div>{formatTime(interaction.date)}</div>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap font-medium">
                  {interactionTypeLabels[interaction.type]}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {interaction.company ? (
                    <Link
                      className="hover:underline"
                      href={`/companies/${interaction.company.id}`}
                    >
                      {interaction.company.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {interaction.contact ? (
                    <Link
                      className="hover:underline"
                      href={`/contacts/${interaction.contact.id}`}
                    >
                      {interaction.contact.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {interaction.opportunity ? (
                    <Link
                      className="hover:underline"
                      href={`/opportunities/${interaction.opportunity.id}`}
                    >
                      {interaction.opportunity.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-500">
                  {interaction.service?.name ?? "-"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-500">
                  {interaction.executedBy?.name ?? "-"}
                </td>
                <td className="px-4 py-2">
                  <p className="max-w-xs truncate text-slate-700" title={interaction.content}>
                    {interaction.content}
                  </p>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs">
                  {interaction.nextAction ? (
                    <>
                      <span className="font-medium text-slate-700">
                        {interaction.nextAction}
                      </span>
                      <br />
                      <span className="text-slate-500">
                        {formatDateTime(interaction.nextActionDate)}
                      </span>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {interactions.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-slate-500"
                  colSpan={showActionsColumn ? 10 : 9}
                >
                  No hay interacciones para los filtros seleccionados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination
          basePath="/interactions"
          page={page}
          pageSize={PAGE_SIZE}
          params={{ q, type, serviceId }}
          total={total}
        />
      </section>
    </div>
  );
}
