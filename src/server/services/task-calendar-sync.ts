import { prisma } from "@/lib/prisma";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  usableCalendarAccessToken,
} from "@/server/services/google-calendar";

async function accessTokenForUser(userId: string) {
  const connection = await prisma.calendarConnection.findUnique({ where: { userId } });
  if (!connection) return null;

  try {
    const { accessToken, refreshed } = await usableCalendarAccessToken(connection);
    if (refreshed) {
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          accessTokenEncrypted: refreshed.accessTokenEncrypted,
          tokenExpiresAt: refreshed.tokenExpiresAt,
        },
      });
    }
    return accessToken;
  } catch {
    return null;
  }
}

export async function syncTaskCalendarEvent(taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    include: {
      company: { select: { name: true } },
      opportunity: { select: { name: true } },
    },
  });
  if (!task) return;

  try {
    if (!task.dueDate || !task.assignedToId) {
      if (task.calendarEventId && task.calendarOwnerId) {
        const accessToken = await accessTokenForUser(task.calendarOwnerId);
        if (accessToken) {
          await deleteCalendarEvent(accessToken, task.calendarEventId);
        }
      }
      await prisma.task.update({
        where: { id: task.id },
        data: { calendarEventId: null, calendarOwnerId: null, calendarSyncedAt: new Date(), calendarError: null },
      });
      return;
    }

    const ownerChanged = task.calendarOwnerId && task.calendarOwnerId !== task.assignedToId;
    if (ownerChanged && task.calendarEventId && task.calendarOwnerId) {
      const previousAccessToken = await accessTokenForUser(task.calendarOwnerId);
      if (previousAccessToken) {
        await deleteCalendarEvent(previousAccessToken, task.calendarEventId);
      }
    }

    const accessToken = await accessTokenForUser(task.assignedToId);
    if (!accessToken) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          calendarEventId: ownerChanged ? null : task.calendarEventId,
          calendarOwnerId: ownerChanged ? null : task.calendarOwnerId,
          calendarError: "El usuario asignado no tiene Google Calendar conectado.",
        },
      });
      return;
    }

    const summary = task.company
      ? `${task.company.name} - ${task.title}`
      : task.title;
    const descriptionParts: string[] = [];
    if (task.opportunity) descriptionParts.push(`Oportunidad: ${task.opportunity.name}`);
    if (task.description) descriptionParts.push(task.description);
    const description = descriptionParts.length > 0 ? descriptionParts.join("\n") : undefined;

    if (task.calendarEventId && !ownerChanged) {
      await updateCalendarEvent(accessToken, task.calendarEventId, {
        summary,
        description,
        start: task.dueDate,
      });
      await prisma.task.update({
        where: { id: task.id },
        data: { calendarSyncedAt: new Date(), calendarError: null },
      });
      return;
    }

    const eventId = await createCalendarEvent(accessToken, {
      summary,
      description,
      start: task.dueDate,
    });
    await prisma.task.update({
      where: { id: task.id },
      data: {
        calendarEventId: eventId,
        calendarOwnerId: task.assignedToId,
        calendarSyncedAt: new Date(),
        calendarError: null,
      },
    });
  } catch (error) {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        calendarError: error instanceof Error ? error.message : "Error desconocido al sincronizar.",
      },
    });
  }
}
