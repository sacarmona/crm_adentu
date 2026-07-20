"use server";

import { AuditAction, TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  interactionSchema,
  taskSchema,
  taskStatusSchema,
} from "@/schemas/crm";
import {
  parseLocalDateTime,
  taskExecutionFields,
} from "@/server/services/activity";
import { requireAdmin, requireWriter } from "@/server/authz";
import { syncTaskCalendarEvent } from "@/server/services/task-calendar-sync";
import { usableCalendarAccessToken } from "@/server/services/google-calendar";
import { googleTasksScopesGranted, listAllGoogleTasks } from "@/server/services/google-tasks";

async function assertNoActiveDependents(
  entityLabel: string,
  checks: { label: string; count: number }[],
) {
  const blocking = checks.filter((check) => check.count > 0);
  if (blocking.length === 0) return;
  const detail = blocking
    .map((check) => `${check.count} ${check.label}`)
    .join(", ");
  throw new Error(
    `No se puede eliminar ${entityLabel}: tiene registros activos relacionados (${detail}). Reasignalos o eliminalos primero.`,
  );
}

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function activityPaths(input: {
  companyId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
}) {
  return [
    "/interactions",
    "/tasks",
    ...(input.companyId ? [`/companies/${input.companyId}`] : []),
    ...(input.contactId ? [`/contacts/${input.contactId}`] : []),
    ...(input.opportunityId
      ? [`/opportunities/${input.opportunityId}`]
      : []),
  ];
}

export async function createInteraction(formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar la actividad comercial.");
  const data = interactionSchema.parse(parseForm(formData));
  const date = parseLocalDateTime(data.date);
  const nextActionDate = parseLocalDateTime(data.nextActionDate);

  if (!date) {
    throw new Error("La fecha de interaccion no es valida.");
  }

  const interaction = await prisma.$transaction(async (tx) => {
    const created = await tx.interaction.create({
      data: {
        date,
        type: data.type,
        content: data.content,
        companyId: data.companyId,
        contactId: data.contactId,
        opportunityId: data.opportunityId,
        serviceId: data.serviceId,
        executedById: user.id,
        nextAction: data.nextAction,
        nextActionDate,
        nextActionDueDate: nextActionDate,
        nextActionStatus: data.nextAction ? TaskStatus.PENDING : null,
      },
    });

    const nextActionTask = data.nextAction
      ? await tx.task.create({
          data: {
            title: data.nextAction,
            status: TaskStatus.PENDING,
            dueDate: nextActionDate,
            companyId: data.companyId,
            contactId: data.contactId,
            opportunityId: data.opportunityId,
            interactionId: created.id,
            serviceId: data.serviceId,
            assignedToId: user.id,
            createdById: user.id,
          },
        })
      : null;

    await Promise.all([
      data.companyId
        ? tx.company.updateMany({
            where: {
              id: data.companyId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
      data.contactId
        ? tx.contact.updateMany({
            where: {
              id: data.contactId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
      data.opportunityId
        ? tx.opportunity.updateMany({
            where: {
              id: data.opportunityId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
      data.opportunityId && nextActionDate
        ? tx.opportunity.update({
            where: { id: data.opportunityId },
            data: { nextActionDate },
          })
        : Promise.resolve(),
    ]);

    await tx.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "Interaction",
        entityId: created.id,
        actorId: user.id,
        after: {
          type: created.type,
          date: created.date.toISOString(),
          hasNextAction: Boolean(data.nextAction),
        },
      },
    });

    return { created, nextActionTaskId: nextActionTask?.id };
  });

  if (interaction.nextActionTaskId) {
    await syncTaskCalendarEvent(interaction.nextActionTaskId);
  }

  activityPaths(data).forEach((path) => revalidatePath(path));
  redirect(`/interactions?created=${interaction.created.id}`);
}

export async function updateInteraction(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar la actividad comercial.");
  const data = interactionSchema.parse(parseForm(formData));
  const date = parseLocalDateTime(data.date);
  const nextActionDate = parseLocalDateTime(data.nextActionDate);

  if (!date) {
    throw new Error("La fecha de interaccion no es valida.");
  }

  const before = await prisma.interaction.findFirst({
    where: { id, deletedAt: null },
  });
  if (!before) {
    throw new Error("La interaccion ya no esta disponible.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.interaction.update({
      where: { id },
      data: {
        date,
        type: data.type,
        content: data.content,
        companyId: data.companyId,
        contactId: data.contactId,
        opportunityId: data.opportunityId,
        serviceId: data.serviceId,
        nextAction: data.nextAction,
        nextActionDate,
        nextActionDueDate: nextActionDate,
        nextActionStatus: data.nextAction
          ? (before.nextActionStatus ?? TaskStatus.PENDING)
          : null,
      },
    });

    await Promise.all([
      data.companyId
        ? tx.company.updateMany({
            where: {
              id: data.companyId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
      data.contactId
        ? tx.contact.updateMany({
            where: {
              id: data.contactId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
      data.opportunityId
        ? tx.opportunity.updateMany({
            where: {
              id: data.opportunityId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
    ]);

    await tx.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "Interaction",
        entityId: id,
        actorId: user.id,
        before: {
          companyId: before.companyId,
          contactId: before.contactId,
          opportunityId: before.opportunityId,
          serviceId: before.serviceId,
        },
        after: {
          companyId: data.companyId,
          contactId: data.contactId,
          opportunityId: data.opportunityId,
          serviceId: data.serviceId,
        },
      },
    });
  });

  activityPaths(data).forEach((path) => revalidatePath(path));
  revalidatePath(`/interactions/${id}/edit`);
  redirect("/interactions");
}

export async function createTask(formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar la actividad comercial.");
  const data = taskSchema.parse(parseForm(formData));
  const execution = taskExecutionFields(data.status, data.result);
  const task = await prisma.task.create({
    data: {
      ...data,
      dueDate: parseLocalDateTime(data.dueDate),
      ...execution,
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "Task",
      entityId: task.id,
      actorId: user.id,
      after: { title: task.title, status: task.status },
    },
  });

  await syncTaskCalendarEvent(task.id);

  activityPaths(data).forEach((path) => revalidatePath(path));
  redirect(`/tasks?created=${task.id}`);
}

export async function createQuickTask(data: {
  title: string;
  opportunityId: string;
  companyId: string | null;
  dueDate?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireWriter("No tienes permisos para crear tareas.");
    const task = await prisma.task.create({
      data: {
        title: data.title.trim(),
        status: TaskStatus.PENDING,
        opportunityId: data.opportunityId,
        companyId: data.companyId ?? undefined,
        dueDate: data.dueDate ? parseLocalDateTime(data.dueDate) : undefined,
        createdById: user.id,
        assignedToId: user.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "Task",
        entityId: task.id,
        actorId: user.id,
        after: { title: task.title, status: task.status, source: "pipeline-quick" },
      },
    });
    await syncTaskCalendarEvent(task.id);
    revalidatePath("/pipeline");
    revalidatePath("/tasks");
    revalidatePath(`/opportunities/${data.opportunityId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al crear tarea." };
  }
}

export async function changeTaskStatus(formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar la actividad comercial.");
  const data = taskStatusSchema.parse(parseForm(formData));
  const before = await prisma.task.findFirst({
    where: { id: data.taskId, deletedAt: null },
  });

  if (!before) {
    throw new Error("La tarea ya no esta disponible.");
  }

  const result = data.result ?? before.result;
  const execution = taskExecutionFields(data.status, result);
  await prisma.$transaction([
    prisma.task.update({
      where: { id: before.id },
      data: execution,
    }),
    ...(before.interactionId
      ? [
          prisma.interaction.update({
            where: { id: before.interactionId },
            data: { nextActionStatus: data.status },
          }),
        ]
      : []),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "Task",
        entityId: before.id,
        actorId: user.id,
        before: { status: before.status, result: before.result },
        after: { status: data.status, result },
      },
    }),
  ]);

  activityPaths(before).forEach((path) => revalidatePath(path));
}

export async function updateTaskAssignee(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar la actividad comercial.");
  const assignedToId = (formData.get("assignedToId") as string) || null;
  const before = await prisma.task.findFirst({
    where: { id, deletedAt: null },
  });
  if (!before) throw new Error("La tarea ya no esta disponible.");

  await prisma.$transaction([
    prisma.task.update({ where: { id }, data: { assignedToId } }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "Task",
        entityId: id,
        actorId: user.id,
        before: { assignedToId: before.assignedToId },
        after: { assignedToId },
      },
    }),
  ]);

  await syncTaskCalendarEvent(id);
  revalidatePath("/tasks");
}

export async function updateTaskDueDate(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar la actividad comercial.");
  const dueDate = parseLocalDateTime(formData.get("dueDate") as string | null);
  if (!dueDate) throw new Error("La fecha limite no es valida.");

  const before = await prisma.task.findFirst({
    where: { id, deletedAt: null },
  });
  if (!before) throw new Error("La tarea ya no esta disponible.");

  await prisma.$transaction([
    prisma.task.update({ where: { id }, data: { dueDate } }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "Task",
        entityId: id,
        actorId: user.id,
        before: { dueDate: before.dueDate },
        after: { dueDate },
      },
    }),
  ]);

  await syncTaskCalendarEvent(id);
  revalidatePath("/tasks");
}

export async function deleteInteraction(id: string) {
  const user = await requireAdmin("Solo ADMIN puede eliminar interacciones.");
  const before = await prisma.interaction.findFirst({
    where: { id, deletedAt: null },
  });
  if (!before) {
    throw new Error("La interaccion ya no esta disponible.");
  }

  const [tasks, aiInsights, attachments, emailMessages] = await Promise.all([
    prisma.task.count({ where: { interactionId: id, deletedAt: null } }),
    prisma.aiInsight.count({ where: { interactionId: id, deletedAt: null } }),
    prisma.attachment.count({ where: { interactionId: id, deletedAt: null } }),
    prisma.emailMessage.count({ where: { interactionId: id } }),
  ]);
  await assertNoActiveDependents("la interaccion", [
    { label: "tareas activas", count: tasks },
    { label: "insights de IA", count: aiInsights },
    { label: "adjuntos", count: attachments },
    { label: "correos vinculados", count: emailMessages },
  ]);

  await prisma.$transaction([
    prisma.interaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "Interaction",
        entityId: id,
        actorId: user.id,
        before: { type: before.type, date: before.date.toISOString() },
      },
    }),
  ]);

  activityPaths(before).forEach((path) => revalidatePath(path));
  redirect("/interactions");
}


function optionalFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function importGoogleTasks() {
  const user = await requireWriter("No tienes permisos para importar tareas de Google.");
  const connection = await prisma.calendarConnection.findUnique({ where: { userId: user.id } });
  if (!connection) {
    revalidatePath("/tasks");
    return;
  }
  if (!googleTasksScopesGranted(connection.scope)) {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastError: "Reconecta Google para autorizar la importacion de Google Tasks." },
    });
    revalidatePath("/tasks");
    revalidatePath("/settings");
    return;
  }

  let accessToken: string;
  let refreshed: Awaited<ReturnType<typeof usableCalendarAccessToken>>["refreshed"];
  try {
    const usable = await usableCalendarAccessToken(connection);
    accessToken = usable.accessToken;
    refreshed = usable.refreshed;
  } catch (error) {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastError: error instanceof Error ? error.message : "No fue posible usar la conexion Google." },
    });
    revalidatePath("/tasks");
    return;
  }
  if (refreshed) {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        accessTokenEncrypted: refreshed.accessTokenEncrypted,
        tokenExpiresAt: refreshed.tokenExpiresAt,
      },
    });
  }

  let importedTasks;
  try {
    importedTasks = await listAllGoogleTasks(accessToken);
  } catch (error) {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastError: error instanceof Error ? error.message : "Google Tasks rechazo la importacion." },
    });
    revalidatePath("/tasks");
    return;
  }
  const now = new Date();
  for (const importedTask of importedTasks) {
    await prisma.task.upsert({
      where: {
        googleTaskOwnerId_googleTaskListId_googleTaskId: {
          googleTaskOwnerId: user.id,
          googleTaskListId: importedTask.taskListId,
          googleTaskId: importedTask.taskId,
        },
      },
      update: {
        title: importedTask.title,
        description: importedTask.notes ?? `Importada desde Google Tasks (${importedTask.taskListTitle}).`,
        status: importedTask.status,
        dueDate: importedTask.dueDate,
        executedAt: importedTask.completedAt,
        googleTaskUpdatedAt: importedTask.updatedAt,
        googleTaskSyncedAt: now,
        googleTaskWebUrl: importedTask.webViewLink,
      },
      create: {
        title: importedTask.title,
        description: importedTask.notes ?? `Importada desde Google Tasks (${importedTask.taskListTitle}).`,
        status: importedTask.status,
        dueDate: importedTask.dueDate,
        executedAt: importedTask.completedAt,
        assignedToId: user.id,
        createdById: user.id,
        googleTaskOwnerId: user.id,
        googleTaskListId: importedTask.taskListId,
        googleTaskId: importedTask.taskId,
        googleTaskUpdatedAt: importedTask.updatedAt,
        googleTaskSyncedAt: now,
        googleTaskWebUrl: importedTask.webViewLink,
      },
    });
  }

  await prisma.calendarConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: now, lastError: null },
  });
  revalidatePath("/tasks");
}

export async function updateTaskCrmLinks(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para vincular tareas.");
  const before = await prisma.task.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new Error("La tarea ya no esta disponible.");

  const title = optionalFormText(formData, "title");
  const data = {
    ...(title ? { title } : {}),
    companyId: optionalFormText(formData, "companyId"),
    contactId: optionalFormText(formData, "contactId"),
    opportunityId: optionalFormText(formData, "opportunityId"),
    interactionId: optionalFormText(formData, "interactionId"),
    serviceId: optionalFormText(formData, "serviceId"),
  };

  await prisma.$transaction([
    prisma.task.update({ where: { id }, data }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "Task",
        entityId: id,
        actorId: user.id,
        before: {
          title: before.title,
          companyId: before.companyId,
          contactId: before.contactId,
          opportunityId: before.opportunityId,
          interactionId: before.interactionId,
          serviceId: before.serviceId,
        },
        after: data,
      },
    }),
  ]);

  revalidatePath("/tasks");
}
