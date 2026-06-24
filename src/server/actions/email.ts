"use server";

import {
  AuditAction,
  EmailClassificationStatus,
  InteractionType,
  TaskStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/server/authz";
import {
  classifyEmailMessage,
  classifyPendingEmails,
} from "@/server/services/email-agent";
import { synchronizeEmailConnection } from "@/server/services/email-sync";

export async function syncEmailConnection(connectionId: string) {
  const user = await requireWriter("No tienes permisos para sincronizar correo.");
  await synchronizeEmailConnection(connectionId, user.id);
  revalidatePath("/email");
}

export async function disconnectEmailConnection(connectionId: string) {
  const user = await requireWriter("No tienes permisos para desconectar correo.");
  const connection = await prisma.emailConnection.findFirst({
    where: { id: connectionId, userId: user.id },
  });
  if (!connection) {
    throw new Error("La conexion de correo no existe.");
  }

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "EmailConnection",
        entityId: connection.id,
        actorId: user.id,
        before: {
          provider: connection.provider,
          emailAddress: connection.emailAddress,
        },
      },
    }),
    prisma.emailConnection.delete({ where: { id: connection.id } }),
  ]);
  revalidatePath("/email");
}

export async function analyzeEmailMessage(messageId: string) {
  const user = await requireWriter("No tienes permisos para analizar correo.");
  await classifyEmailMessage({
    messageId,
    actorId: user.id,
  });
  revalidatePath("/email");
}

export async function analyzePendingEmails() {
  const user = await requireWriter("No tienes permisos para analizar correo.");
  await classifyPendingEmails({
    userId: user.id,
    limit: 5,
    enforceHourlyLimit: true,
  });
  revalidatePath("/email");
}

export async function approveEmailClassification(classificationId: string) {
  const user = await requireWriter("No tienes permisos para aprobar correo.");
  const classification = await prisma.emailClassification.findFirst({
    where: {
      id: classificationId,
      status: EmailClassificationStatus.PROPOSED,
      emailMessage: { connection: { userId: user.id } },
    },
    include: { emailMessage: true },
  });
  if (!classification) {
    throw new Error("La clasificacion ya no esta disponible.");
  }
  if (!classification.isCommercial) {
    throw new Error("Un correo no comercial debe marcarse como ignorado.");
  }

  await prisma.$transaction(async (tx) => {
    const interaction = await tx.interaction.create({
      data: {
        date: classification.emailMessage.sentAt,
        type: InteractionType.EMAIL,
        content: classification.summary,
        contactId: classification.matchedContactId,
        companyId: classification.matchedCompanyId,
        opportunityId: classification.matchedOpportunityId,
        executedById: user.id,
        nextAction: classification.suggestedNextAction,
        nextActionDate: classification.suggestedDueDate,
        nextActionDueDate: classification.suggestedDueDate,
        nextActionStatus: classification.suggestedNextAction
          ? TaskStatus.PENDING
          : null,
      },
    });
    if (classification.suggestedNextAction) {
      await tx.task.create({
        data: {
          title: classification.suggestedNextAction,
          status: TaskStatus.PENDING,
          dueDate: classification.suggestedDueDate,
          contactId: classification.matchedContactId,
          companyId: classification.matchedCompanyId,
          opportunityId: classification.matchedOpportunityId,
          interactionId: interaction.id,
          assignedToId: user.id,
          createdById: user.id,
        },
      });
    }
    await tx.emailMessage.update({
      where: { id: classification.emailMessageId },
      data: { interactionId: interaction.id },
    });
    await tx.emailClassification.update({
      where: { id: classification.id },
      data: {
        status: EmailClassificationStatus.APPROVED,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
    await Promise.all([
      classification.matchedContactId
        ? tx.contact.updateMany({
            where: {
              id: classification.matchedContactId,
              OR: [
                { lastInteraction: null },
                { lastInteraction: { lt: classification.emailMessage.sentAt } },
              ],
            },
            data: { lastInteraction: classification.emailMessage.sentAt },
          })
        : Promise.resolve(),
      classification.matchedCompanyId
        ? tx.company.updateMany({
            where: {
              id: classification.matchedCompanyId,
              OR: [
                { lastInteraction: null },
                { lastInteraction: { lt: classification.emailMessage.sentAt } },
              ],
            },
            data: { lastInteraction: classification.emailMessage.sentAt },
          })
        : Promise.resolve(),
      classification.matchedOpportunityId
        ? tx.opportunity.updateMany({
            where: {
              id: classification.matchedOpportunityId,
              OR: [
                { lastInteraction: null },
                { lastInteraction: { lt: classification.emailMessage.sentAt } },
              ],
            },
            data: { lastInteraction: classification.emailMessage.sentAt },
          })
        : Promise.resolve(),
      classification.matchedOpportunityId && classification.suggestedDueDate
        ? tx.opportunity.update({
            where: { id: classification.matchedOpportunityId },
            data: { nextActionDate: classification.suggestedDueDate },
          })
        : Promise.resolve(),
    ]);
    await tx.auditLog.create({
      data: {
        action: AuditAction.AI_SUGGESTION_APPROVAL,
        entityType: "EmailClassification",
        entityId: classification.id,
        actorId: user.id,
        after: { interactionId: interaction.id },
      },
    });
  });
  revalidatePath("/email");
  revalidatePath("/interactions");
  revalidatePath("/tasks");
}

export async function ignoreEmailClassification(classificationId: string) {
  const user = await requireWriter("No tienes permisos para ignorar correo.");
  const classification = await prisma.emailClassification.findFirst({
    where: {
      id: classificationId,
      status: EmailClassificationStatus.PROPOSED,
      emailMessage: { connection: { userId: user.id } },
    },
  });
  if (!classification) {
    throw new Error("La clasificacion ya no esta disponible.");
  }
  await prisma.$transaction([
    prisma.emailClassification.update({
      where: { id: classification.id },
      data: {
        status: EmailClassificationStatus.IGNORED,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "EmailClassification",
        entityId: classification.id,
        actorId: user.id,
        after: { status: EmailClassificationStatus.IGNORED },
      },
    }),
  ]);
  revalidatePath("/email");
}
