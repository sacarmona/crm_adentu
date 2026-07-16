import { AiInsightStatus, OpportunityStatus, TaskStatus, UserRole } from "@prisma/client";
import { Bot, Building2, Clock, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import {
  aiInsightStatusLabels,
  commercialSentimentLabels,
  opportunityStatusLabels,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  analyzeOpportunity,
  deleteInsight,
} from "@/server/actions/intelligence";
import { MIN_INTERACTIONS_FOR_OPPORTUNITY_ANALYSIS } from "@/lib/intelligence";
import { isActiveProviderConfigured } from "@/server/services/ai-provider";
import { isTavilyConfigured } from "@/server/services/web-search";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ACTIVE_STATUSES = [
  OpportunityStatus.EXPLORATION,
  OpportunityStatus.PROPOSAL_SENT,
  OpportunityStatus.NEGOTIATION,
  OpportunityStatus.STALLED,
];

const statusStyles: Record<AiInsightStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PROPOSED: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
};

const opportunityStatusColors: Record<string, string> = {
  EXPLORATION: "bg-sky-50 text-sky-700",
  PROPOSAL_SENT: "bg-violet-50 text-violet-700",
  NEGOTIATION: "bg-amber-50 text-amber-700",
  STALLED: "bg-rose-50 text-rose-700",
};

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const filterStatus = params?.status as AiInsightStatus | undefined;
  const errorMessage = params?.error ? decodeURIComponent(params.error) : null;

  const canEdit = session?.user.role !== UserRole.LECTURA;
  const [aiConfigured, tavilyConfigured] = await Promise.all([
    isActiveProviderConfigured(),
    Promise.resolve(isTavilyConfigured()),
  ]);
  const canUseAi = aiConfigured && canEdit;

  const [opportunities, insights] = await Promise.all([
    canUseAi
      ? prisma.opportunity.findMany({
          where: { deletedAt: null, status: { in: ACTIVE_STATUSES } },
          include: {
            company: true,
            service: true,
            _count: {
              select: {
                interactions: { where: { deletedAt: null } },
                tasks: { where: { deletedAt: null, status: TaskStatus.PENDING } },
              },
            },
            aiInsights: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true, status: true },
            },
          },
          orderBy: { lastInteraction: "asc" },
          take: 60,
        }).then((rows) =>
          rows.filter(
            (o) => o._count.interactions >= MIN_INTERACTIONS_FOR_OPPORTUNITY_ANALYSIS,
          ),
        )
      : Promise.resolve([]),
    prisma.aiInsight.findMany({
      where: { deletedAt: null, ...(filterStatus ? { status: filterStatus } : {}) },
      include: {
        opportunity: { include: { company: true } },
        approvedBy: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inteligencia comercial</h1>
          <p className="mt-1 text-sm text-slate-600">
            Analisis de oportunidades activas con IA. Requieren revision antes de aplicar cambios.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {tavilyConfigured ? (
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
              + Contexto web activo
            </span>
          ) : null}
          {!aiConfigured && canEdit ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">
              IA no configurada
            </span>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="font-medium">Error al analizar:</span> {errorMessage}
        </div>
      ) : null}

      {!aiConfigured && canEdit ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Define <code>OPENAI_API_KEY</code> o <code>ANTHROPIC_API_KEY</code> en Configuracion para habilitar nuevos analisis.
          Las sugerencias existentes siguen disponibles.
        </div>
      ) : null}

      {/* KPIs */}
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <Bot className="h-5 w-5 text-teal-700" aria-hidden />
          <p className="mt-3 text-xs text-slate-500">Sugerencias totales</p>
          <p className="mt-1 text-2xl font-semibold">{insights.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <Sparkles className="h-5 w-5 text-amber-600" aria-hidden />
          <p className="mt-3 text-xs text-slate-500">Pendientes de revision</p>
          <p className="mt-1 text-2xl font-semibold">
            {insights.filter((i) => i.status === AiInsightStatus.PROPOSED).length}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden />
          <p className="mt-3 text-xs text-slate-500">Aprobadas</p>
          <p className="mt-1 text-2xl font-semibold">
            {insights.filter((i) => i.status === AiInsightStatus.APPROVED).length}
          </p>
        </div>
      </section>

      {/* Oportunidades para analizar */}
      {canUseAi && opportunities.length > 0 ? (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Oportunidades activas</h2>
            <p className="text-xs text-slate-500">
              Ordenadas por mayor tiempo sin contacto · {opportunities.length} oportunidades
            </p>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {opportunities.map((opp) => {
              const dias = daysSince(opp.lastInteraction);
              const lastInsight = opp.aiInsights[0];
              const diasDesdeAnalisis = daysSince(lastInsight?.createdAt);
              const urgent = dias !== null && dias > 14;
              const recentlyAnalyzed = diasDesdeAnalisis !== null && diasDesdeAnalisis < 7;

              return (
                <article key={opp.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="font-medium hover:underline"
                        href={`/opportunities/${opp.id}`}
                      >
                        {opp.name}
                      </Link>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${opportunityStatusColors[opp.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {opportunityStatusLabels[opp.status]}
                      </span>
                      {recentlyAnalyzed ? (
                        <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          Analizado hace {diasDesdeAnalisis}d
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {opp.company ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" aria-hidden />
                          {opp.company.name}
                        </span>
                      ) : null}
                      <span>{opp._count.interactions} interacciones</span>
                      {opp._count.tasks > 0 ? (
                        <span>{opp._count.tasks} tarea{opp._count.tasks !== 1 ? "s" : ""} pendiente{opp._count.tasks !== 1 ? "s" : ""}</span>
                      ) : null}
                      {dias !== null ? (
                        <span
                          className={`flex items-center gap-1 ${urgent ? "font-medium text-rose-600" : ""}`}
                        >
                          <Clock className="h-3 w-3" aria-hidden />
                          {dias === 0 ? "Hoy" : `Hace ${dias} día${dias !== 1 ? "s" : ""} sin contacto`}
                        </span>
                      ) : (
                        <span>Sin interacciones registradas</span>
                      )}
                    </div>
                  </div>
                  <form action={analyzeOpportunity.bind(null, opp.id)} className="shrink-0">
                    <SubmitButton
                      pendingLabel="Analizando..."
                      size="sm"
                      variant={recentlyAnalyzed ? "outline" : "default"}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden />
                      {recentlyAnalyzed ? "Re-analizar" : "Analizar"}
                    </SubmitButton>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {canUseAi && opportunities.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No hay oportunidades activas para analizar.
        </div>
      ) : null}

      {/* Historial de análisis */}
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Historial de analisis</h2>
      </div>

      <form className="flex gap-3 rounded-md border border-slate-200 bg-white p-4">
        <select
          className="h-10 w-60 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={filterStatus ?? ""}
          name="status"
        >
          <option value="">Todos los estados</option>
          {Object.values(AiInsightStatus).map((value) => (
            <option key={value} value={value}>
              {aiInsightStatusLabels[value]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">Filtrar</Button>
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
                    {insight.summary ?? "Ver analisis"}
                  </Link>
                  {insight.opportunity?.company ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {insight.opportunity.company.name}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs">
                  {insight.opportunity ? (
                    <Link
                      className="hover:underline"
                      href={`/opportunities/${insight.opportunity.id}`}
                    >
                      {insight.opportunity.name}
                    </Link>
                  ) : "-"}
                </td>
                <td className="px-4 py-3">
                  {insight.sentiment ? commercialSentimentLabels[insight.sentiment] : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[insight.status]}`}>
                    {aiInsightStatusLabels[insight.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{formatDateTime(insight.createdAt)}</td>
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
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  No hay analisis para el filtro seleccionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
