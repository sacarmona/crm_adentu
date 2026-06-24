import { TaskStatus, UserRole } from "@prisma/client";
import { Check, Circle, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { taskStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { changeTaskStatus } from "@/server/actions/activity";
import { isOverdueTask } from "@/server/services/activity";

export const dynamic = "force-dynamic";

const statusStyles: Record<TaskStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  EXECUTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    assignedToId?: string;
    scope?: string;
  }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const status = params?.status as TaskStatus | undefined;
  const assignedToId =
    params?.scope === "mine" ? session?.user.id : params?.assignedToId;
  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(assignedToId ? { assignedToId } : {}),
      },
      include: {
        assignedTo: true,
        company: true,
        contact: true,
        opportunity: true,
        service: true,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const canEdit = session?.user.role !== UserRole.LECTURA;

  return (
    <div className="space-y-5">
      <EntityHeader
        actionHref={canEdit ? "/tasks/new" : undefined}
        actionLabel={canEdit ? "Nueva tarea" : undefined}
        description="Agenda comercial con responsables, vencimientos, ejecución y resultados."
        title="Tareas"
      />
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[200px_240px_180px_auto]">
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={status ?? ""}
          name="status"
        >
          <option value="">Todos los estados</option>
          {Object.values(TaskStatus).map((value) => (
            <option key={value} value={value}>
              {taskStatusLabels[value]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={params?.assignedToId ?? ""}
          name="assignedToId"
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
          <option value="mine">Solo mis tareas</option>
        </select>
        <Button type="submit">Filtrar</Button>
      </form>
      <section className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white">
        {tasks.map((task) => {
          const overdue = isOverdueTask({
            status: task.status,
            dueDate: task.dueDate,
          });

          return (
            <article className="p-4" key={task.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{task.title}</h2>
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                        statusStyles[task.status],
                      )}
                    >
                      {taskStatusLabels[task.status]}
                    </span>
                    {overdue ? (
                      <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                        Vencida
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Limite: {formatDateTime(task.dueDate)} · Responsable:{" "}
                    {task.assignedTo?.name ?? "Sin asignar"}
                  </p>
                  {task.description ? (
                    <p className="mt-2 text-sm text-slate-700">
                      {task.description}
                    </p>
                  ) : null}
                  {task.result ? (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Resultado:</span> {task.result}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {task.company ? (
                      <Link
                        className="font-medium hover:underline"
                        href={`/companies/${task.company.id}`}
                      >
                        {task.company.name}
                      </Link>
                    ) : null}
                    {task.contact ? (
                      <Link
                        className="font-medium hover:underline"
                        href={`/contacts/${task.contact.id}`}
                      >
                        {task.contact.name}
                      </Link>
                    ) : null}
                    {task.opportunity ? (
                      <Link
                        className="font-medium hover:underline"
                        href={`/opportunities/${task.opportunity.id}`}
                      >
                        {task.opportunity.name}
                      </Link>
                    ) : null}
                    {task.service ? <span>{task.service.name}</span> : null}
                  </div>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={changeTaskStatus}>
                      <input name="taskId" type="hidden" value={task.id} />
                      <input
                        name="status"
                        type="hidden"
                        value={TaskStatus.PENDING}
                      />
                      <Button
                        disabled={task.status === TaskStatus.PENDING}
                        size="sm"
                        title="Marcar pendiente"
                        type="submit"
                        variant="outline"
                      >
                        <Circle className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </form>
                    <form action={changeTaskStatus}>
                      <input name="taskId" type="hidden" value={task.id} />
                      <input
                        name="status"
                        type="hidden"
                        value={TaskStatus.EXECUTED}
                      />
                      <Button
                        disabled={task.status === TaskStatus.EXECUTED}
                        size="sm"
                        title="Marcar ejecutada"
                        type="submit"
                        variant="outline"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </form>
                    <form action={changeTaskStatus}>
                      <input name="taskId" type="hidden" value={task.id} />
                      <input
                        name="status"
                        type="hidden"
                        value={TaskStatus.CLOSED}
                      />
                      <Button
                        disabled={task.status === TaskStatus.CLOSED}
                        size="sm"
                        title="Cerrar tarea"
                        type="submit"
                        variant="outline"
                      >
                        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
        {tasks.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No hay tareas para los filtros seleccionados.
          </p>
        ) : null}
      </section>
    </div>
  );
}
