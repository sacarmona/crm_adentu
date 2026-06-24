import { InteractionType, UserRole } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { interactionTypeLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { analyzeInteraction } from "@/server/actions/intelligence";
import { isAiConfigured } from "@/server/services/openai";

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
  const canAnalyze = canEdit && isAiConfigured();

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
              {interactionTypeLabels[value]}
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
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Oportunidad</th>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Ejecuto</th>
              <th className="px-4 py-3">Contenido</th>
              <th className="px-4 py-3">Proxima accion</th>
              {canAnalyze ? <th className="px-4 py-3">Acciones</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {interactions.map((interaction) => (
              <tr key={interaction.id}>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                  {formatDateTime(interaction.date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-medium">
                  {interactionTypeLabels[interaction.type]}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
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
                <td className="px-4 py-3 whitespace-nowrap">
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
                <td className="px-4 py-3 whitespace-nowrap">
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
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                  {interaction.service?.name ?? "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                  {interaction.executedBy?.name ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-xs truncate text-slate-700" title={interaction.content}>
                    {interaction.content}
                  </p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">
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
                {canAnalyze ? (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <form action={analyzeInteraction.bind(null, interaction.id)}>
                      <Button size="sm" type="submit" variant="outline">
                        Analizar con IA
                      </Button>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))}
            {interactions.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-slate-500"
                  colSpan={canAnalyze ? 10 : 9}
                >
                  No hay interacciones para los filtros seleccionados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
