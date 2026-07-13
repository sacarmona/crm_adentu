import { OpportunityStatus } from "@prisma/client";
import { LockKeyhole, Search } from "lucide-react";

import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { opportunityStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getFollowUpHealth } from "@/server/services/dashboard-metrics";
import { pipelineStages, summarizePipeline } from "@/server/services/pipeline";

export const dynamic = "force-dynamic";

const statusColors: Record<OpportunityStatus, string> = {
  EXPLORATION: "from-cyan-500 to-blue-600",
  PROPOSAL_SENT: "from-violet-500 to-fuchsia-600",
  NEGOTIATION: "from-amber-400 to-orange-600",
  WON: "from-emerald-400 to-teal-600",
  STALLED: "from-rose-400 to-red-600",
  LOST: "from-slate-400 to-slate-700",
};

const followUpLabels = {
  normal: "Seguimiento al dia",
  watch: "Requiere seguimiento",
  stalled: "Sin actividad reciente",
  closed: "Cerrada",
};

function isOpportunityStatus(value?: string): value is OpportunityStatus {
  return Object.values(OpportunityStatus).includes(value as OpportunityStatus);
}

function getShareAccess(token?: string) {
  const requiredToken = process.env.PIPELINE_SHARE_TOKEN?.trim();

  if (!requiredToken) {
    return {
      allowed: false,
      title: "Vista no configurada",
      message:
        "Define PIPELINE_SHARE_TOKEN en el hosting para habilitar enlaces publicos de solo lectura.",
    };
  }

  if (token !== requiredToken) {
    return {
      allowed: false,
      title: "Vista protegida",
      message: "Solicita un enlace vigente con token para revisar el pipeline comercial.",
    };
  }

  return { allowed: true, title: "", message: "" };
}

export default async function SharedPipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{
    responsibleId?: string;
    status?: string;
    token?: string;
  }>;
}) {
  const params = await searchParams;
  const access = getShareAccess(params?.token);

  if (!access.allowed) {
    return (
      <main className="min-h-screen bg-[#08111f] px-6 py-12 text-white">
        <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
          <div className="rounded-full bg-white/10 p-4 text-cyan-200 ring-1 ring-white/15">
            <LockKeyhole className="h-10 w-10" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold">{access.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{access.message}</p>
        </section>
      </main>
    );
  }

  const selectedStatus = isOpportunityStatus(params?.status)
    ? params?.status
    : undefined;
  const responsibleId = params?.responsibleId || undefined;

  const [opportunities, users] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        ...(responsibleId ? { responsibleId } : {}),
        ...(selectedStatus ? { status: selectedStatus } : {}),
      },
      include: {
        company: true,
        primaryContact: true,
        responsible: true,
        service: true,
      },
      orderBy: [{ status: "asc" }, { estimatedCloseDate: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const cards = opportunities.map((opportunity) => ({
    id: opportunity.id,
    name: opportunity.name,
    status: opportunity.status,
    companyName: opportunity.company?.name ?? "Sin empresa",
    contactName: opportunity.primaryContact?.name ?? "Sin contacto",
    serviceName: opportunity.service?.name ?? "Sin servicio",
    responsibleName: opportunity.responsible?.name ?? "Sin responsable",
    probability: Number(opportunity.probability),
    totalAmount: Number(opportunity.totalAmount),
    weightedAmount: Number(opportunity.weightedAmount),
    estimatedCloseDate: opportunity.estimatedCloseDate,
    nextActionDate: opportunity.nextActionDate,
    followUp: getFollowUpHealth(opportunity),
  }));
  const summary = summarizePipeline(cards);
  const totalAmount = cards.reduce((sum, card) => sum + card.totalAmount, 0);
  const weightedAmount = cards.reduce((sum, card) => sum + card.weightedAmount, 0);
  const activeStages = pipelineStages.filter((stage) =>
    cards.some((card) => card.status === stage),
  );

  return (
    <main className="min-h-screen bg-[#08111f] text-white">
      <section className="relative isolate overflow-hidden px-5 py-8 md:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.28),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(217,70,239,0.26),transparent_24%),linear-gradient(135deg,#08111f,#102544_48%,#14213d)]" />
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                CRM ADENTU
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                Pipeline comercial
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                Vista HTML de consulta para compartir el avance comercial sin acceso
                completo a la aplicacion.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-right ring-1 ring-white/15 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                Actualizado
              </p>
              <p className="mt-1 text-lg font-semibold">{formatDate(new Date())}</p>
            </div>
          </header>

          <section className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 text-slate-950 shadow-xl shadow-black/10">
              <p className="text-sm text-slate-500">Oportunidades visibles</p>
              <p className="mt-2 text-3xl font-semibold">{cards.length}</p>
            </div>
            <div className="rounded-2xl bg-cyan-300 p-5 text-slate-950 shadow-xl shadow-cyan-950/20">
              <p className="text-sm text-slate-700">Monto total</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="rounded-2xl bg-lime-300 p-5 text-slate-950 shadow-xl shadow-lime-950/20">
              <p className="text-sm text-slate-700">Monto ponderado</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(weightedAmount)}</p>
            </div>
          </section>

          <form className="mt-6 grid gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur md:grid-cols-[1fr_1fr_auto]">
            <input name="token" type="hidden" value={params?.token ?? ""} />
            <label className="text-sm text-slate-200">
              Responsable
              <select
                className="mt-2 h-11 w-full rounded-xl border border-white/20 bg-white px-3 text-sm text-slate-950"
                defaultValue={responsibleId ?? ""}
                name="responsibleId"
              >
                <option value="">Todos los responsables</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-200">
              Estado
              <select
                className="mt-2 h-11 w-full rounded-xl border border-white/20 bg-white px-3 text-sm text-slate-950"
                defaultValue={selectedStatus ?? ""}
                name="status"
              >
                <option value="">Todos los estados</option>
                {pipelineStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {opportunityStatusLabels[stage]}
                  </option>
                ))}
              </select>
            </label>
            <button className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
              <Search className="h-4 w-4" aria-hidden="true" />
              Filtrar
            </button>
          </form>
        </div>
      </section>

      <section className="px-5 pb-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(activeStages.length ? activeStages : pipelineStages).map((stage) => {
              const stageCards = cards.filter((card) => card.status === stage);
              const totals = summary[stage];

              return (
                <section
                  className="overflow-hidden rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/10"
                  key={stage}
                >
                  <header className={`bg-gradient-to-br ${statusColors[stage]} p-4 text-white`}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold">{opportunityStatusLabels[stage]}</h2>
                      <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                        {totals.count}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/85">
                      {formatCurrency(totals.totalAmount)} total -{" "}
                      {formatCurrency(totals.weightedAmount)} ponderado
                    </p>
                  </header>
                  <div className="space-y-3 bg-slate-50 p-3">
                    {stageCards.map((opportunity) => (
                      <article
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        key={opportunity.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold leading-snug">
                              {opportunity.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {opportunity.companyName}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {formatPercent(opportunity.probability)}
                          </span>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-xs uppercase text-slate-400">Monto</dt>
                            <dd className="font-semibold">{formatCurrency(opportunity.totalAmount)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase text-slate-400">Ponderado</dt>
                            <dd className="font-semibold">
                              {formatCurrency(opportunity.weightedAmount)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase text-slate-400">Responsable</dt>
                            <dd>{opportunity.responsibleName}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase text-slate-400">Servicio</dt>
                            <dd>{opportunity.serviceName}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase text-slate-400">Contacto</dt>
                            <dd>{opportunity.contactName}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase text-slate-400">Cierre estimado</dt>
                            <dd>{formatDate(opportunity.estimatedCloseDate)}</dd>
                          </div>
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                            {followUpLabels[opportunity.followUp.level]}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Proxima accion: {formatDate(opportunity.nextActionDate)}
                          </span>
                        </div>
                      </article>
                    ))}
                    {stageCards.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        Sin oportunidades para este estado.
                      </p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            Vista de solo lectura. Para editar oportunidades se requiere ingresar al CRM.
          </p>
        </div>
      </section>
    </main>
  );
}
