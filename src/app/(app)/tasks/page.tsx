import { TaskStatus, UserRole } from "@prisma/client";
import { Check, Circle, ExternalLink, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { localDateTimeValue } from "@/components/activity/forms";
import { EntityHeader } from "@/components/crm/entity-header";
import { InlineDateForm } from "@/components/crm/inline-date-form";
import { InlineSelectForm } from "@/components/crm/inline-select-form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { taskStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  changeTaskStatus,
  importGoogleTasks,
  updateTaskAssignee,
  updateTaskCrmLinks,
  updateTaskDueDate,
} from "@/server/actions/activity";
import { isOverdueTask } from "@/server/services/activity";
import { googleTasksScopesGranted } from "@/server/services/google-tasks";

export const dynamic = "force-dynamic";

const statusStyles: Record<TaskStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  EXECUTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
};

type Option = { id: string; name: string };

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: Option[];
}) {
  return (
    <label>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
        defaultValue={defaultValue ?? ""}
        name={name}
      >
        <option value="">Sin vincular</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    assignedToId?: string;
    scope?: string;
    source?: string;
  }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const hasFilters = Boolean(
    params && ("status" in params || "assignedToId" in params || "scope" in params || "source" in params),
  );
  const status = (hasFilters ? params?.status : TaskStatus.PENDING) as
    | TaskStatus
    | undefined;
  const scope = hasFilters ? params?.scope : "mine";
  const source = params?.source ?? "";
  const assignedToId =
    scope === "mine" ? session?.user.id : params?.assignedToId;
  const [tasks, users, companies, contacts, opportunities, interactions, services, calendarConnection] = await Promise.all([
    prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(assignedToId ? { assignedToId } : {}),
        ...(source === "google" ? { googleTaskId: { not: null } } : {}),
      },
      include: {
        assignedTo: true,
        company: true,
        contact: true,
        opportunity: true,
        interaction: true,
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
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.opportunity.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.interaction.findMany({
      where: { deletedAt: null },
      select: { id: true, date: true, content: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    session?.user.id
      ? prisma.calendarConnection.findUnique({ where: { userId: session.user.id } })
      : Promise.resolve(null),
  ]);
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const canImportGoogleTasks = Boolean(calendarConnection && googleTasksScopesGranted(calendarConnection.scope));
  const interactionOptions = interactions.map((interaction) => ({
    id: interaction.id,
    name: `${formatDateTime(interaction.date)} - ${interaction.content.slice(0, 60)}`,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EntityHeader
          actionHref={canEdit ? "/tasks/new" : undefined}
          actionLabel={canEdit ? "Nueva tarea" : undefined}
          description="Agenda comercial con responsables, vencimientos, ejecucion y resultados."
          title="Tareas"
        />
        {canEdit ? (
          <form action={importGoogleTasks}>
            <SubmitButton disabled={!canImportGoogleTasks} pendingLabel="Importando" variant="outline">
              Importar Google Tasks
            </SubmitButton>
          </form>
        ) : null}
      </div>
      {!calendarConnection && canEdit ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Conecta Google Calendar/Tasks en Configuracion para importar tareas de Google.
        </p>
      ) : null}
      {calendarConnection && !canImportGoogleTasks && canEdit ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Reconecta Google en Configuracion para autorizar Google Tasks antes de importar.
        </p>
      ) : null}
      {calendarConnection?.lastError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {calendarConnection.lastError}
        </p>
      ) : null}
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[200px_240px_180px_180px_auto]">
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
          defaultValue={scope ?? ""}
          name="scope"
        >
          <option value="">Todo el equipo</option>
          <option value="mine">Solo mis tareas</option>
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={source}
          name="source"
        >
          <option value="">Todos los origenes</option>
          <option value="google">Google Tasks</option>
        </select>
        <Button type="submit">Filtrar</Button>
      </form>
      <section className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white">
        {tasks.map((task) => {
          const overdue = isOverdueTask({
            status: task.status,
            dueDate: task.dueDate,
          });
          const isGoogleTask = Boolean(task.googleTaskId);

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
                    {isGoogleTask ? (
                      <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                        Google Tasks
                      </span>
                    ) : null}
                    {overdue ? (
                      <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                        Vencida
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>Limite:</span>
                    {canEdit ? (
                      <InlineDateForm
                        action={updateTaskDueDate.bind(null, task.id)}
                        defaultValue={localDateTimeValue(task.dueDate ?? new Date())}
                        name="dueDate"
                      />
                    ) : (
                      <span>{formatDateTime(task.dueDate)}</span>
                    )}
                    <span>- Responsable:</span>
                    {canEdit ? (
                      <div className="w-44">
                        <InlineSelectForm
                          action={updateTaskAssignee.bind(null, task.id)}
                          defaultValue={task.assignedToId ?? ""}
                          name="assignedToId"
                          options={users.map((user) => ({ value: user.id, label: user.name }))}
                          placeholder="Sin asignar"
                        />
                      </div>
                    ) : (
                      <span>{task.assignedTo?.name ?? "Sin asignar"}</span>
                    )}
                    {task.googleTaskSyncedAt ? (
                      <span>Sincronizada: {formatDateTime(task.googleTaskSyncedAt)}</span>
                    ) : null}
                  </div>
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
                      <Link className="font-medium hover:underline" href={`/companies/${task.company.id}`}>
                        {task.company.name}
                      </Link>
                    ) : null}
                    {task.contact ? (
                      <Link className="font-medium hover:underline" href={`/contacts/${task.contact.id}`}>
                        {task.contact.name}
                      </Link>
                    ) : null}
                    {task.opportunity ? (
                      <Link className="font-medium hover:underline" href={`/opportunities/${task.opportunity.id}`}>
                        {task.opportunity.name}
                      </Link>
                    ) : null}
                    {task.interaction ? <span>Interaccion vinculada</span> : null}
                    {task.service ? <span>{task.service.name}</span> : null}
                    {task.googleTaskWebUrl ? (
                      <a className="inline-flex items-center gap-1 font-medium hover:underline" href={task.googleTaskWebUrl} rel="noreferrer" target="_blank">
                        Abrir en Google <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-emerald-700">
                        Editar tarea
                      </summary>
                      <form
                        action={updateTaskCrmLinks.bind(null, task.id)}
                        className="mt-3 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-3 xl:grid-cols-6"
                      >
                        <div className="md:col-span-3 xl:col-span-6">
                          <label>
                            <span className="text-xs font-medium text-slate-600">Titulo</span>
                            <input
                              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-xs"
                              defaultValue={task.title}
                              name="title"
                            />
                          </label>
                        </div>
                        <SelectField defaultValue={task.companyId} label="Empresa" name="companyId" options={companies} />
                        <SelectField defaultValue={task.contactId} label="Contacto" name="contactId" options={contacts} />
                        <SelectField defaultValue={task.opportunityId} label="Oportunidad" name="opportunityId" options={opportunities} />
                        <SelectField defaultValue={task.interactionId} label="Interaccion" name="interactionId" options={interactionOptions} />
                        <SelectField defaultValue={task.serviceId} label="Servicio" name="serviceId" options={services} />
                        <div className="flex items-end">
                          <SubmitButton pendingLabel="Guardando" size="sm" variant="outline">
                            Guardar
                          </SubmitButton>
                        </div>
                      </form>
                    </details>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={changeTaskStatus}>
                      <input name="taskId" type="hidden" value={task.id} />
                      <input name="status" type="hidden" value={TaskStatus.PENDING} />
                      <Button disabled={task.status === TaskStatus.PENDING} size="sm" title="Marcar pendiente" type="submit" variant="outline">
                        <Circle className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </form>
                    <form action={changeTaskStatus}>
                      <input name="taskId" type="hidden" value={task.id} />
                      <input name="status" type="hidden" value={TaskStatus.EXECUTED} />
                      <Button disabled={task.status === TaskStatus.EXECUTED} size="sm" title="Marcar ejecutada" type="submit" variant="outline">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </form>
                    <form action={changeTaskStatus}>
                      <input name="taskId" type="hidden" value={task.id} />
                      <input name="status" type="hidden" value={TaskStatus.CLOSED} />
                      <Button disabled={task.status === TaskStatus.CLOSED} size="sm" title="Cerrar tarea" type="submit" variant="outline">
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
