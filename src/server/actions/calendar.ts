"use server";

import {
  AiInsightType,
  AuditAction,
  CalendarMeetingArtifactStatus,
  CalendarMeetingArtifactType,
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
import { analyzeInteractionWithActiveProvider } from "@/server/services/ai-provider";
import { conferenceRecordForMeeting, listMeetArtifacts, transcriptText } from "@/server/services/google-meet";

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
        ? CalendarMeetingStatus.MINUTES_PENDING
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
      status: optionalText(formData.get("minutes"))
        ? CalendarMeetingStatus.MINUTES_PENDING
        : CalendarMeetingStatus.COMPLETED,
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

export async function deleteMeeting(meetingId: string) {
  const user = await requireWriter("No tienes permisos para eliminar reuniones.");
  const meeting = await prisma.calendarMeeting.findFirst({
    where: { id: meetingId, userId: user.id },
  });
  if (!meeting) throw new Error("La reunion ya no esta disponible.");
  if (meeting.status !== CalendarMeetingStatus.IGNORED) {
    throw new Error("Solo se pueden eliminar reuniones descartadas.");
  }

  await prisma.calendarMeeting.delete({ where: { id: meeting.id } });
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


export async function discoverMeetingArtifacts(meetingId: string) {
  const user = await requireWriter("No tienes permisos para buscar artefactos de reuniones.");
  const meeting = await prisma.calendarMeeting.findFirst({
    where: { id: meetingId, userId: user.id },
    include: { artifacts: true },
  });
  if (!meeting) throw new Error("La reunion no esta disponible.");

  const accessToken = await calendarAccessForUser(user.id);

  let conferenceRecordName: string | null;
  try {
    conferenceRecordName = await conferenceRecordForMeeting(accessToken, meeting);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al consultar Google Meet.";
    await prisma.calendarMeeting.update({
      where: { id: meeting.id },
      data: { lastDiscoveryError: message },
    });
    revalidatePath("/meetings");
    return;
  }

  if (!conferenceRecordName) {
    await prisma.calendarMeeting.update({
      where: { id: meeting.id },
      data: {
        lastDiscoveryError:
          "Google Meet aun no genero un registro para esta reunion. Esto pasa si no se activo grabacion o notas con Gemini durante la llamada, o si todavia esta procesando (puede tardar hasta un par de horas tras finalizar).",
      },
    });
    revalidatePath("/meetings");
    return;
  }

  await prisma.calendarMeeting.update({
    where: { id: meeting.id },
    data: { lastDiscoveryError: null },
  });

  const artifacts = await listMeetArtifacts(accessToken, conferenceRecordName);
  for (const artifact of artifacts) {
    await prisma.calendarMeetingArtifact.upsert({
      where: {
        meetingId_sourceName: {
          meetingId: meeting.id,
          sourceName: artifact.sourceName,
        },
      },
      update: {
        type: artifact.type,
        exportUri: artifact.exportUri,
        driveFileId: artifact.driveFileId,
        documentId: artifact.documentId,
        lastError: null,
      },
      create: {
        meetingId: meeting.id,
        type: artifact.type,
        sourceName: artifact.sourceName,
        exportUri: artifact.exportUri,
        driveFileId: artifact.driveFileId,
        documentId: artifact.documentId,
      },
    });
  }

  if (meeting.status === CalendarMeetingStatus.COMPLETED) {
    await prisma.calendarMeeting.update({
      where: { id: meeting.id },
      data: { status: CalendarMeetingStatus.MINUTES_PENDING },
    });
  }

  revalidatePath("/meetings");
}

export async function importMeetingTranscript(artifactId: string) {
  const user = await requireWriter("No tienes permisos para importar transcripciones.");
  const artifact = await prisma.calendarMeetingArtifact.findFirst({
    where: {
      id: artifactId,
      type: CalendarMeetingArtifactType.TRANSCRIPT,
      meeting: { userId: user.id },
    },
    include: { meeting: true },
  });
  if (!artifact) throw new Error("La transcripcion no esta disponible.");

  const accessToken = await calendarAccessForUser(user.id);
  try {
    const text = await transcriptText(accessToken, artifact.sourceName);
    if (!text.trim()) throw new Error("Google Meet devolvio una transcripcion vacia.");

    await prisma.$transaction([
      prisma.calendarMeetingArtifact.update({
        where: { id: artifact.id },
        data: {
          textContent: text,
          status: CalendarMeetingArtifactStatus.IMPORTED,
          fetchedAt: new Date(),
          lastError: null,
        },
      }),
      prisma.calendarMeeting.update({
        where: { id: artifact.meetingId },
        data: {
          minutes: text,
          status: CalendarMeetingStatus.MINUTES_PENDING,
        },
      }),
    ]);
  } catch (error) {
    await prisma.calendarMeetingArtifact.update({
      where: { id: artifact.id },
      data: {
        status: CalendarMeetingArtifactStatus.FAILED,
        lastError: error instanceof Error ? error.message : "Error desconocido.",
      },
    });
    throw error;
  }

  revalidatePath("/meetings");
}

export async function analyzeMeetingWithAi(meetingId: string) {
  const user = await requireWriter("No tienes permisos para analizar reuniones.");
  const meeting = await prisma.calendarMeeting.findFirst({
    where: { id: meetingId, userId: user.id },
    include: {
      company: true,
      contact: true,
      opportunity: true,
      service: true,
      artifacts: true,
    },
  });
  if (!meeting) throw new Error("La reunion no esta disponible.");

  const sourceText =
    meeting.minutes ??
    meeting.artifacts.find((artifact) => artifact.textContent)?.textContent ??
    null;
  if (!sourceText) {
    throw new Error("Agrega una minuta o importa una transcripcion antes de analizar.");
  }

  const analysis = await analyzeInteractionWithActiveProvider({
    interactionType: "Reunion Google Meet",
    interactionDate: meeting.startsAt,
    content: sourceText,
    companyName: meeting.company?.name,
    contactName: meeting.contact?.name,
    opportunityName: meeting.opportunity?.name,
    opportunityStatus: meeting.opportunity?.status,
    opportunityProbability: meeting.opportunity ? Number(meeting.opportunity.probability) : null,
    serviceName: meeting.service?.name,
  });

  const nextAction = analysis.suggestedChanges.nextAction ?? analysis.suggestedNextSteps[0] ?? null;
  await prisma.$transaction(async (tx) => {
    await tx.aiInsight.create({
      data: {
        type: AiInsightType.INTERACTION_ANALYSIS,
        status: "PROPOSED",
        companyId: meeting.companyId,
        contactId: meeting.contactId,
        opportunityId: meeting.opportunityId,
        summary: analysis.summary,
        customerInterests: analysis.customerInterests,
        objections: analysis.objections,
        commitments: analysis.commitments,
        risks: analysis.risks,
        suggestedNextSteps: analysis.suggestedNextSteps,
        mentionedServices: analysis.mentionedServices,
        sentiment: analysis.sentiment,
        suggestedAdvanceProbability: analysis.suggestedAdvanceProbability,
        suggestedChanges: analysis.suggestedChanges,
      },
    });

    if (nextAction) {
      await tx.task.create({
        data: {
          title: nextAction,
          description: `Sugerida por IA desde reunion Meet: ${meeting.summary}`,
          status: TaskStatus.PENDING,
          companyId: meeting.companyId,
          contactId: meeting.contactId,
          opportunityId: meeting.opportunityId,
          serviceId: meeting.serviceId,
          assignedToId: user.id,
          createdById: user.id,
        },
      });
    }

    await tx.calendarMeeting.update({
      where: { id: meeting.id },
      data: { status: CalendarMeetingStatus.ANALYZED },
    });
  });

  revalidatePath("/meetings");
  revalidatePath("/intelligence");
  revalidatePath("/tasks");
}
