"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { OpportunityStatus } from "@prisma/client";
import { CalendarDays, GripVertical, Plus, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRef, useMemo, useState, useTransition } from "react";

import { createQuickTask } from "@/server/actions/activity";

import { followUpHealthLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { changeOpportunityStage } from "@/server/actions/crm";
import type { FollowUpHealth } from "@/server/services/dashboard-metrics";
import {
  pipelineStageLabels,
  pipelineStages,
  summarizePipeline,
} from "@/server/services/pipeline";

export type PipelineOpportunity = {
  id: string;
  name: string;
  status: OpportunityStatus;
  companyId: string | null;
  companyName: string | null;
  serviceName: string | null;
  responsibleName: string | null;
  probability: number;
  totalAmount: number;
  weightedAmount: number;
  followUp: { level: FollowUpHealth; days: number };
  estimatedCloseDate: string | null;
};

function FollowUpBadge({
  followUp,
}: {
  followUp: { level: FollowUpHealth; days: number };
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
        followUp.level === "stalled"
          ? "bg-red-50 text-red-700"
          : followUp.level === "watch"
            ? "bg-amber-50 text-amber-700"
            : followUp.level === "closed"
              ? "bg-slate-100 text-slate-500"
              : "bg-emerald-50 text-emerald-700",
      )}
    >
      {followUpHealthLabels[followUp.level]}
      {followUp.level === "closed" ? "" : ` · ${followUp.days}d`}
    </span>
  );
}

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  timeZone: "Etc/GMT+4",
});

function QuickTaskDialog({
  opportunity,
  onClose,
}: {
  opportunity: PipelineOpportunity;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string).trim();
    if (!title) return;
    setError(null);
    startTransition(async () => {
      const result = await createQuickTask({
        title,
        opportunityId: opportunity.id,
        companyId: opportunity.companyId,
        dueDate: (fd.get("dueDate") as string) || undefined,
      });
      if (result.ok) {
        setDone(true);
        setTimeout(onClose, 900);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Nueva tarea</p>
            <p className="mt-0.5 text-xs text-slate-500 truncate max-w-[220px]">
              {opportunity.companyName ? `${opportunity.companyName} · ` : ""}{opportunity.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        {done ? (
          <p className="py-4 text-center text-sm font-medium text-emerald-600">✓ Tarea creada</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              ref={titleRef}
              autoFocus
              name="title"
              required
              minLength={3}
              placeholder="Descripción de la tarea"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <input
              name="dueDate"
              type="datetime-local"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {isPending ? "Guardando..." : "Crear tarea"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function PipelineCard({
  opportunity,
  canEdit,
  overlay = false,
}: {
  opportunity: PipelineOpportunity;
  canEdit: boolean;
  overlay?: boolean;
}) {
  const [showQuickTask, setShowQuickTask] = useState(false);
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({
    id: opportunity.id,
    data: { status: opportunity.status },
    disabled: !canEdit || overlay,
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
      }}
      className={cn(
        "rounded-md border border-slate-200 bg-white p-3 shadow-sm",
        overlay && "w-72 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        {canEdit ? (
          <button
            className="mt-0.5 cursor-grab text-slate-400 active:cursor-grabbing"
            type="button"
            title="Mover oportunidad"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Mover {opportunity.name}</span>
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <Link
            className="line-clamp-2 text-sm font-semibold text-slate-950 hover:underline"
            href={`/opportunities/${opportunity.id}`}
          >
            {opportunity.name}
          </Link>
          <p className="mt-1 truncate text-xs text-slate-500">
            {opportunity.companyName ?? "Sin empresa"}
          </p>
        </div>
        <FollowUpBadge followUp={opportunity.followUp} />
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-sm font-semibold">
          {currencyFormatter.format(opportunity.totalAmount)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Ponderado {currencyFormatter.format(opportunity.weightedAmount)} ·{" "}
          {Math.round(opportunity.probability * 100)}%
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="flex min-w-0 items-center gap-1">
          <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {opportunity.responsibleName ?? "Sin responsable"}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {opportunity.estimatedCloseDate
              ? dateFormatter.format(new Date(opportunity.estimatedCloseDate))
              : "Sin fecha"}
          </span>
          {canEdit && !overlay ? (
            <button
              type="button"
              title="Nueva tarea rápida"
              onClick={() => setShowQuickTask(true)}
              className="rounded-md border border-slate-200 p-0.5 text-slate-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      {showQuickTask ? (
        <QuickTaskDialog opportunity={opportunity} onClose={() => setShowQuickTask(false)} />
      ) : null}
    </article>
  );
}

function PipelineColumn({
  status,
  opportunities,
  canEdit,
}: {
  status: OpportunityStatus;
  opportunities: PipelineOpportunity[];
  canEdit: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const totals = summarizePipeline(opportunities)[status];

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[310px] shrink-0 flex-col rounded-md border border-slate-200 bg-slate-50",
        isOver && canEdit && "border-sky-400 bg-sky-50",
      )}
    >
      <header className="border-b border-slate-200 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{pipelineStageLabels[status]}</h2>
          <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {totals.count}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {currencyFormatter.format(totals.totalAmount)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          Ponderado {currencyFormatter.format(totals.weightedAmount)}
        </p>
      </header>
      <div className="min-h-48 space-y-2 p-2">
        {opportunities.map((opportunity) => (
          <PipelineCard
            canEdit={canEdit}
            key={opportunity.id}
            opportunity={opportunity}
          />
        ))}
        {opportunities.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-slate-400">
            Sin oportunidades
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function PipelineBoard({
  initialOpportunities,
  canEdit,
}: {
  initialOpportunities: PipelineOpportunity[];
  canEdit: boolean;
}) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        pipelineStages.map((status) => [
          status,
          opportunities.filter((opportunity) => opportunity.status === status),
        ]),
      ) as Record<OpportunityStatus, PipelineOpportunity[]>,
    [opportunities],
  );
  const activeOpportunity =
    opportunities.find((opportunity) => opportunity.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setMessage(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const opportunityId = String(event.active.id);
    const targetStatus = event.over?.id as OpportunityStatus | undefined;
    const current = opportunities.find((item) => item.id === opportunityId);

    if (!current || !targetStatus || current.status === targetStatus) {
      return;
    }

    const previousStatus = current.status;
    setOpportunities((items) =>
      items.map((item) =>
        item.id === opportunityId ? { ...item, status: targetStatus } : item,
      ),
    );

    startTransition(async () => {
      try {
        await changeOpportunityStage({ opportunityId, status: targetStatus });
        setMessage(
          `${current.name} movida a ${pipelineStageLabels[targetStatus]}.`,
        );
      } catch {
        setOpportunities((items) =>
          items.map((item) =>
            item.id === opportunityId
              ? { ...item, status: previousStatus }
              : item,
          ),
        );
        setMessage("No fue posible cambiar la etapa. El movimiento se revirtio.");
      }
    });
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      {message ? (
        <div
          className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
          role="status"
        >
          {message}
        </div>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {pipelineStages.map((status) => (
          <PipelineColumn
            canEdit={canEdit}
            key={status}
            opportunities={grouped[status]}
            status={status}
          />
        ))}
      </div>
      <DragOverlay>
        {activeOpportunity ? (
          <PipelineCard
            canEdit={false}
            opportunity={activeOpportunity}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
