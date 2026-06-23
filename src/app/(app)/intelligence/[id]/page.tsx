import { AiInsightStatus, UserRole } from "@prisma/client";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatPercent } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  approveInsight,
  rejectInsight,
} from "@/server/actions/intelligence";

export const dynamic = "force-dynamic";

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const insight = await prisma.aiInsight.findFirst({
    where: { id, deletedAt: null },
    include: {
      interaction: true,
      opportunity: { include: { company: true } },
      approvedBy: true,
    },
  });
  if (!insight) notFound();

  const canReview =
    insight.status === AiInsightStatus.PROPOSED &&
    session?.user.role !== UserRole.LECTURA;
  const suggestedChanges = insight.suggestedChanges as {
    probability?: number | null;
    nextAction?: string | null;
    opportunityStatus?: string | null;
  } | null;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Sugerencia de IA · {insight.status}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {insight.summary ?? insight.type}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Generada {formatDateTime(insight.createdAt)}
              {insight.approvedBy
                ? ` · aprobada por ${insight.approvedBy.name}`
                : ""}
            </p>
          </div>
          {canReview ? (
            <div className="flex gap-2">
              <form action={rejectInsight.bind(null, insight.id)}>
                <Button type="submit" variant="outline">
                  <X className="h-4 w-4" aria-hidden="true" />
                  Rechazar
                </Button>
              </form>
              <form action={approveInsight.bind(null, insight.id)}>
                <Button type="submit">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Aprobar y aplicar
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoList
          items={stringList(insight.customerInterests)}
          title="Intereses"
        />
        <InfoList items={stringList(insight.objections)} title="Objeciones" />
        <InfoList items={stringList(insight.risks)} title="Riesgos" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <InfoList
          items={stringList(insight.commitments)}
          title="Compromisos observados"
        />
        <InfoList
          items={stringList(insight.suggestedNextSteps)}
          title="Siguientes pasos sugeridos"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Cambios propuestos</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Probabilidad</dt>
              <dd className="font-medium">
                {insight.suggestedAdvanceProbability != null
                  ? formatPercent(
                      insight.suggestedAdvanceProbability.toString(),
                    )
                  : "Sin cambio"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Proxima accion</dt>
              <dd className="text-right font-medium">
                {suggestedChanges?.nextAction ?? "Sin cambio"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Etapa sugerida</dt>
              <dd className="font-medium">
                {suggestedChanges?.opportunityStatus ?? "Sin cambio"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            La aprobacion aplica la probabilidad y crea una tarea para la
            proxima accion. La etapa sugerida se presenta como referencia y no
            se cambia automaticamente.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Contexto</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Sentimiento</dt>
              <dd className="mt-1 font-medium">{insight.sentiment ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Oportunidad</dt>
              <dd className="mt-1">
                {insight.opportunity ? (
                  <Link
                    className="font-medium hover:underline"
                    href={`/opportunities/${insight.opportunity.id}`}
                  >
                    {insight.opportunity.name}
                  </Link>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Interaccion original</dt>
              <dd className="mt-1 text-slate-700">
                {insight.interaction?.content ?? "-"}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li className="border-l-2 border-slate-200 pl-3" key={item}>
            {item}
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-slate-500">Sin elementos detectados.</li>
        ) : null}
      </ul>
    </div>
  );
}
