import { AiInsightStatus, UserRole } from "@prisma/client";
import { Bot, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import {
  aiInsightStatusLabels,
  commercialSentimentLabels,
  interactionTypeLabels,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { analyzeInteraction, deleteInsight } from "@/server/actions/intelligence";
import { isAiConfigured } from "@/server/services/openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const statusStyles: Record<AiInsightStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PROPOSED: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
};

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const status = params?.status as AiInsightStatus | undefined;
  const errorMessage = params?.error ? decodeURIComponent(params.error) : null;
  const configured = isAiConfigured();
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const canUseAi =
    configured &&
    session?.user.role !== UserRole.LECTURA;
  const [insights, interactions] = await Promise.all([
    prisma.aiInsight.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      include: {
        interaction: true,
        opportunity: { include: { company: true } },
        approvedBy: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.interaction.findMany({
      where: {
        deletedAt: null,
        aiInsights: { none: { deletedAt: null } },
      },
      include: { company: true, opportunity: true },
      orderBy: { date: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Inteligencia comercial</h1>
        <p className="mt-1 text-sm text-slate-600">
          Analisis estructurados que requieren revision humana antes de aplicar
          cambios.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="font-medium">Error al analizar:</span> {errorMessage}
        </div>
      ) : null}
      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Define `OPENAI_API_KEY` y opcionalmente `OPENAI_MODEL` para habilitar
          nuevos analisis. Las sugerencias existentes siguen disponibles.
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <Summary
          icon={Bot}
          label="Sugerencias"
          value={insights.length}
        />
        <Summary
          icon={Sparkles}
          label="Pendientes"
          value={
            insights.filter(
              (insight) => insight.status === AiInsightStatus.PROPOSED,
            ).length
          }
        />
        <Summary
          icon={ShieldCheck}
          label="Aprobadas"
          value={
            insights.filter(
              (insight) => insight.status === AiInsightStatus.APPROVED,
            ).length
          }
        />
      </section>

      {canUseAi && interactions.length > 0 ? (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Interacciones por analizar</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {interactions.map((interaction) => (
              <article
                className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-3"
                key={interaction.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {interaction.company?.name ??
                      interaction.opportunity?.name ??
                      interactionTypeLabels[interaction.type]}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {interaction.content}
                  </p>
                </div>
                <form action={analyzeInteraction.bind(null, interaction.id)}>
                  <Button size="sm" type="submit" variant="outline">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Analizar
                  </Button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <form className="flex gap-3 rounded-md border border-slate-200 bg-white p-4">
        <select
          className="h-10 w-60 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={status ?? ""}
          name="status"
        >
          <option value="">Todos los estados</option>
          {Object.values(AiInsightStatus).map((value) => (
            <option key={value} value={value}>
              {aiInsightStatusLabels[value]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Analisis</th>
              <th className="px-4 py-3">Oportunidad</th>
              <th className="px-4 py-3">Sentimiento</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {insights.map((insight) => (
              <tr key={insight.id}>
                <td className="max-w-lg px-4 py-3">
                  <Link
                    className="font-medium hover:underline"
                    href={`/intelligence/${insight.id}`}
                  >
                    {insight.summary ?? insight.type}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {insight.opportunity?.name ?? "-"}
                </td>
                <td className="px-4 py-3">
                  {insight.sentiment ? commercialSentimentLabels[insight.sentiment] : "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[insight.status]}`}
                  >
                    {aiInsightStatusLabels[insight.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {formatDateTime(insight.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {insight.status === AiInsightStatus.REJECTED && canEdit ? (
                    <form action={deleteInsight.bind(null, insight.id)}>
                      <SubmitButton pendingLabel="Eliminando" size="sm" variant="outline">
                        Eliminar
                      </SubmitButton>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
            {insights.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-slate-500"
                  colSpan={6}
                >
                  No hay sugerencias para el filtro seleccionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Bot;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
