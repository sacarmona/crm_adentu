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

    if (data.nextAction) {
      await tx.task.create({
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
      });
    }

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

    return created;
  });

  activityPaths(data).forEach((path) => revalidatePath(path));
  redirect(`/interactions?created=${interaction.id}`);
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

  activityPaths(data).forEach((path) => revalidatePath(path));
  redirect(`/tasks?created=${task.id}`);
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
