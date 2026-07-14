import { TaskStatus } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Handshake,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import {
  OpportunityDistributionChart,
  PipelineStageChart,
} from "@/components/dashboard/dashboard-charts";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { interactionTypeLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  calculateDashboardMetrics,
  daysSince,
  openPipelineStatuses,
} from "@/server/services/dashboard-metrics";
import {
  pipelineStageLabels,
  pipelineStages,
  summarizePipeline,
} from "@/server/services/pipeline";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ responsibleId?: string; scope?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const responsibleId =
    params?.scope === "mine" ? session?.user.id : params?.responsibleId;
  const now = new Date();
  const dormantBoundary = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [opportunities, tasks, recentInteractions, users] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        ...(responsibleId ? { responsibleId } : {}),
      },
      include: { company: true, responsible: true, service: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(responsibleId ? { assignedToId: responsibleId } : {}),
      },
      include: { assignedTo: true, company: true, opportunity: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.interaction.findMany({
      where: {
        deletedAt: null,
        ...(responsibleId ? { executedById: responsibleId } : {}),
      },
      include: {
        executedBy: true,
        company: true,
        opportunity: true,
      },
      orderBy: { date: "desc" },
      take: 6,
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const metrics = calculateDashboardMetrics({
    now,
    opportunities: opportunities.map((opportunity) => ({
      status: opportunity.status,
      totalAmount: Number(opportunity.totalAmount),
      weightedAmount: Number(opportunity.weightedAmount),
      lastInteraction: opportunity.lastInteraction,
      createdAt: opportunity.createdAt,
    })),
    tasks,
  });
  const pipelineSummary = summarizePipeline(
    opportunities.map((opportunity) => ({
      status: opportunity.status,
      totalAmount: Number(opportunity.totalAmount),
      weightedAmount: Number(opportunity.weightedAmount),
    })),
  );
  const stageData = pipelineStages.map((status) => ({
    stage: pipelineStageLabels[status],
    total: pipelineSummary[status].totalAmount,
    weighted: pipelineSummary[status].weightedAmount,
  }));
  const serviceData = Object.values(
    opportunities
      .filter((opportunity) => openPipelineStatuses.has(opportunity.status))
      .reduce<Record<string, { name: string; value: number }>>(
        (result, opportunity) => {
          const name = opportunity.service?.name ?? "Sin servicio";
          result[name] ??= { name, value: 0 };
          result[name].value += 1;
          return result;
        },
        {},
      ),
  ).sort((a, b) => b.value - a.value);
  const overdueTasks = tasks
    .filter(
      (task) =>
        task.status === TaskStatus.PENDING &&
        task.dueDate &&
        task.dueDate < now,
    )
    .slice(0, 5);
  const dormantOpportunities = opportunities
    .filter(
      (opportunity) =>
        openPipelineStatuses.has(opportunity.status) &&
        (opportunity.lastInteraction ?? opportunity.createdAt) <
          dormantBoundary,
    )
    .sort(
      (a, b) =>
        (a.lastInteraction ?? a.createdAt).getTime() -
        (b.lastInteraction ?? b.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard comercial</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pipeline, actividad y alertas que requieren seguimiento.
          </p>
        </div>
        <Button asChild>
          <Link href="/pipeline">
            Abrir pipeline
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <form className="grid gap-3 border-y border-slate-200 bg-white px-4 py-3 md:grid-cols-[240px_180px_auto_1fr]">
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={params?.responsibleId ?? ""}
          name="responsibleId"
        >
          <option value="">Todos los responsables</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={params?.scope ?? ""}
          name="scope"
        >
          <option value="">Todo el equipo</option>
          <option value="mine">Mi cartera</option>
        </select>
        <Button type="submit" variant="outline">
          Aplicar
        </Button>
        <p className="self-center text-right text-xs text-slate-500">
          Actualizado {formatDateTime(now)}
        </p>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          detail={`${metrics.openCount} oportunidades abiertas`}
          icon={Handshake}
          label="Pipeline abierto"
          value={formatCurrency(metrics.openAmount)}
        />
        <Kpi
          detail="Valor ajustado por probabilidad"
          icon={Target}
          label="Pipeline ponderado"
          value={formatCurrency(metrics.weightedAmount)}
        />
        <Kpi
          detail="Oportunidades cerradas ganadas"
          icon={Trophy}
          label="Monto ganado"
          value={formatCurrency(metrics.wonAmount)}
        />
        <Kpi
          alert={metrics.overdueTasks > 0}
          detail={`${metrics.upcomingTasks} vencen en los proximos 7 dias`}
          icon={CalendarClock}
          label="Tareas vencidas"
          value={String(metrics.overdueTasks)}
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="flex min-h-[420px] min-w-0 flex-col rounded-md border border-slate-200 bg-white p-5">
          <div className="flex min-h-12 items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Pipeline por etapa</h2>
              <p className="mt-1 text-xs text-slate-500">
                Monto total versus monto ponderado
              </p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-teal-700" aria-hidden="true" />
          </div>
          <div className="mt-4 flex-1">
            <PipelineStageChart data={stageData} />
          </div>
        </div>
        <div className="flex min-h-[420px] min-w-0 flex-col rounded-md border border-slate-200 bg-white p-5">
          <div className="min-h-12">
            <h2 className="font-semibold">Oportunidades por servicio</h2>
            <p className="mt-1 text-xs text-slate-500">
              Distribucion de la cartera visible
            </p>
          </div>
          <div className="mt-4">
            <OpportunityDistributionChart data={serviceData} />
          </div>
          <div className="mt-3 grid min-h-[76px] grid-cols-2 gap-2 overflow-hidden text-xs">
            {serviceData.slice(0, 6).map((service) => (
              <div className="flex min-w-0 justify-between gap-2" key={service.name}>
                <span className="truncate text-slate-600">{service.name}</span>
                <span className="font-semibold">{service.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AlertList
          empty="No hay tareas vencidas."
          href="/tasks?status=PENDING"
          icon={CalendarClock}
          title="Tareas vencidas"
        >
          {overdueTasks.map((task) => (
            <li className="flex items-start justify-between gap-4" key={task.id}>
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.company?.name ?? task.opportunity?.name ?? "Sin relacion"} ·{" "}
                  {task.assignedTo?.name ?? "Sin responsable"}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-rose-700">
                {formatDateTime(task.dueDate)}
              </span>
            </li>
          ))}
        </AlertList>
        <AlertList
          empty="No hay oportunidades sin seguimiento."
          href="/pipeline"
          icon={AlertTriangle}
          title={`Sin seguimiento por 14 dias (${metrics.dormantOpportunities})`}
        >
          {dormantOpportunities.map((opportunity) => (
            <li className="flex items-start justify-between gap-4" key={opportunity.id}>
              <div>
                <Link
                  className="font-medium hover:underline"
                  href={`/opportunities/${opportunity.id}`}
                >
                  {opportunity.name}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  {opportunity.company?.name ?? "Sin empresa"} ·{" "}
                  {pipelineStageLabels[opportunity.status]}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-amber-700">
                {daysSince(
                  opportunity.lastInteraction ?? opportunity.createdAt,
                  now,
                )}{" "}
                dias
              </span>
            </li>
          ))}
        </AlertList>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Actividad reciente</h2>
          <Link className="text-sm font-medium hover:underline" href="/interactions">
            Ver historial
          </Link>
        </div>
        <ol className="mt-4 divide-y divide-slate-100">
          {recentInteractions.map((interaction) => (
            <li className="grid gap-2 py-3 md:grid-cols-[150px_170px_1fr]" key={interaction.id}>
              <span className="text-xs text-slate-500">
                {formatDateTime(interaction.date)}
              </span>
              <span className="text-sm font-medium">{interactionTypeLabels[interaction.type]}</span>
              <div className="min-w-0">
                <Link
                  className="line-clamp-2 text-sm text-slate-700 hover:underline"
                  href={`/interactions/${interaction.id}/edit`}
                >
                  {interaction.content}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  {interaction.company?.name ??
                    interaction.opportunity?.name ??
                    "Sin relacion"}{" "}
                  · {interaction.executedBy?.name ?? "Sin ejecutor"}
                </p>
              </div>
            </li>
          ))}
          {recentInteractions.length === 0 ? (
            <li className="py-8 text-center text-sm text-slate-500">
              No hay actividad reciente.
            </li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  alert = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Handshake;
  alert?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon
          className={alert ? "h-5 w-5 text-rose-600" : "h-5 w-5 text-teal-700"}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function AlertList({
  title,
  href,
  empty,
  icon: Icon,
  children,
}: {
  title: string;
  href: string;
  empty: string;
  icon: typeof AlertTriangle;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-amber-700" aria-hidden="true" />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <Link className="text-xs font-medium hover:underline" href={href}>
          Gestionar
        </Link>
      </div>
      <ul className="mt-4 space-y-4 text-sm">
        {hasChildren ? children : <li className="text-slate-500">{empty}</li>}
      </ul>
    </div>
  );
}
