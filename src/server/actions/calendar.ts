"use server";

import {
  AuditAction,
  CalendarMeetingStatus,
  InteractionType,
  TaskStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/server/authz";
import {
  listMeetCalendarEvents,
  usableCalendarAccessToken,
} from "@/server/services/google-calendar";
import { parseLocalDateTime } from "@/server/services/activity";
import { syncTaskCalendarEvent } from "@/server/services/task-calendar-sync";

export async function disconnectCalendarConnection() {
  const user = await requireWriter("No tienes permisos para desconectar el calendario.");
  const connection = await prisma.calendarConnection.findFirst({
    where: { userId: user.id },
  });
  if (!connection) {
    throw new Error("La conexion de calendario no existe.");
  }

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "CalendarConnection",
        entityId: connection.id,
        actorId: user.id,
        before: { emailAddress: connection.emailAddress },
      },
    }),
    prisma.calendarConnection.delete({ where: { id: connection.id } }),
  ]);

  revalidatePath("/settings");
}

function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function calendarAccessForUser(userId: string) {
  const connection = await prisma.calendarConnection.findUnique({ where: { userId } });
  if (!connection) {
    throw new Error("Conecta Google Calendar antes de sincronizar reuniones.");
  }

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
}

export async function syncMeetMeetings() {
  const user = await requireWriter("No tienes permisos para sincronizar reuniones.");
  const accessToken = await calendarAccessForUser(user.id);
  const now = new Date();
  const timeMin = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const events = await listMeetCalendarEvents(accessToken, { timeMin, timeMax });

  for (const event of events) {
    const status =
      event.endsAt && event.endsAt.getTime() < now.getTime()
        ? CalendarMeetingStatus.COMPLETED
        : CalendarMeetingStatus.SCHEDULED;
    const existing = await prisma.calendarMeeting.findUnique({
      where: {
        userId_providerEventId: {
          userId: user.id,
          providerEventId: event.providerEventId,
        },
      },
      select: { status: true },
    });
    const nextStatus =
      existing?.status === CalendarMeetingStatus.IMPORTED ||
      existing?.status === CalendarMeetingStatus.IGNORED
        ? existing.status
        : status;
    await prisma.calendarMeeting.upsert({
      where: {
        userId_providerEventId: {
          userId: user.id,
          providerEventId: event.providerEventId,
        },
      },
      update: {
        summary: event.summary,
        description: event.description,
        meetingUri: event.meetingUri,
        conferenceId: event.conferenceId,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        attendees: event.attendees,
        organizerEmail: event.organizerEmail,
        status: nextStatus,
        lastSyncedAt: now,
      },
      create: {
        userId: user.id,
        providerEventId: event.providerEventId,
        summary: event.summary,
        description: event.description,
        meetingUri: event.meetingUri,
        conferenceId: event.conferenceId,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        attendees: event.attendees,
        organizerEmail: event.organizerEmail,
        status: nextStatus,
        lastSyncedAt: now,
      },
    });
  }

  await prisma.calendarConnection.update({
    where: { userId: user.id },
    data: { lastSyncedAt: now, lastError: null },
  });

  revalidatePath("/meetings");
}

export async function updateMeetingContext(meetingId: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para actualizar reuniones.");
  const meeting = await prisma.calendarMeeting.findFirst({
    where: { id: meetingId, userId: user.id },
  });
  if (!meeting) throw new Error("La reunion no esta disponible.");

  await prisma.calendarMeeting.update({
    where: { id: meeting.id },
    data: {
      companyId: optionalText(formData.get("companyId")),
      contactId: optionalText(formData.get("contactId")),
      opportunityId: optionalText(formData.get("opportunityId")),
      serviceId: optionalText(formData.get("serviceId")),
      minutes: optionalText(formData.get("minutes")),
    },
  });

  revalidatePath("/meetings");
}

export async function ignoreMeeting(meetingId: string) {
  const user = await requireWriter("No tienes permisos para descartar reuniones.");
  await prisma.calendarMeeting.updateMany({
    where: { id: meetingId, userId: user.id, importedInteractionId: null },
    data: { status: CalendarMeetingStatus.IGNORED },
  });
  revalidatePath("/meetings");
}

export async function createInteractionFromMeeting(meetingId: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para crear interacciones.");
  const meeting = await prisma.calendarMeeting.findFirst({
    where: { id: meetingId, userId: user.id },
  });
  if (!meeting) throw new Error("La reunion no esta disponible.");
  if (meeting.importedInteractionId) {
    throw new Error("Esta reunion ya fue importada como interaccion.");
  }

  const companyId = optionalText(formData.get("companyId")) ?? meeting.companyId;
  const contactId = optionalText(formData.get("contactId")) ?? meeting.contactId;
  const opportunityId = optionalText(formData.get("opportunityId")) ?? meeting.opportunityId;
  const serviceId = optionalText(formData.get("serviceId")) ?? meeting.serviceId;
  const minutes = optionalText(formData.get("minutes")) ?? meeting.minutes;
  const nextAction = optionalText(formData.get("nextAction"));
  const nextActionDate = parseLocalDateTime(optionalText(formData.get("nextActionDate")));

  if (!companyId && !contactId && !opportunityId) {
    throw new Error("Asocia la reunion a una empresa, contacto u oportunidad antes de importarla.");
  }
  if (!minutes) {
    throw new Error("Agrega una minuta antes de crear la interaccion.");
  }

  const content = [
    `Reunion Google Meet: ${meeting.summary}`,
    meeting.meetingUri ? `Enlace: ${meeting.meetingUri}` : null,
    meeting.organizerEmail ? `Organizador: ${meeting.organizerEmail}` : null,
    `Minuta:\n${minutes}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await prisma.$transaction(async (tx) => {
    const interaction = await tx.interaction.create({
      data: {
        date: meeting.startsAt,
        type: InteractionType.ONLINE_MEETING,
        content,
        companyId,
        contactId,
        opportunityId,
        serviceId,
        executedById: user.id,
        nextAction,
        nextActionDate,
        nextActionDueDate: nextActionDate,
        nextActionStatus: nextAction ? TaskStatus.PENDING : null,
      },
    });
    const task = nextAction
      ? await tx.task.create({
          data: {
            title: nextAction,
            status: TaskStatus.PENDING,
            dueDate: nextActionDate,
            companyId,
            contactId,
            opportunityId,
            interactionId: interaction.id,
            serviceId,
            assignedToId: user.id,
            createdById: user.id,
          },
        })
      : null;

    await tx.calendarMeeting.update({
      where: { id: meeting.id },
      data: {
        companyId,
        contactId,
        opportunityId,
        serviceId,
        minutes,
        importedInteractionId: interaction.id,
        status: CalendarMeetingStatus.IMPORTED,
      },
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "Interaction",
        entityId: interaction.id,
        actorId: user.id,
        after: {
          source: "Google Meet",
          meetingId: meeting.id,
          summary: meeting.summary,
        },
      },
    });

    return { interactionId: interaction.id, taskId: task?.id };
  });

  if (result.taskId) {
    await syncTaskCalendarEvent(result.taskId);
  }

  revalidatePath("/meetings");
  revalidatePath("/interactions");
}
