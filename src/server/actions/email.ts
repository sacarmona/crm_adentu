"use server";

import {
  AuditAction,
  EmailClassificationStatus,
  InteractionType,
  OpportunityStatus,
  TaskStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/server/authz";
import {
  analyzeEmailWithActiveProvider,
  isActiveProviderConfigured,
} from "@/server/services/ai-provider";
import { parsedSuggestedDueDate } from "@/server/services/email-analysis";
import { synchronizeEmailConnection } from "@/server/services/email-sync";

const MAX_EMAIL_ANALYSES_PER_HOUR = 20;

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function emailCrmMatch(message: {
  direction: string;
  fromAddress: string;
  toAddresses: unknown;
}) {
  const addresses =
    message.direction === "INBOUND"
      ? [message.fromAddress]
      : stringArray(message.toAddresses);
  const contact = await prisma.contact.findFirst({
    where: {
      deletedAt: null,
      email: { in: addresses, mode: "insensitive" },
    },
    include: { company: true },
  });
  if (!contact) {
    return { contact: null, company: null, opportunity: null };
  }
  const opportunity = await prisma.opportunity.findFirst({
    where: {
      deletedAt: null,
      status: {
        notIn: [OpportunityStatus.WON, OpportunityStatus.LOST],
      },
      OR: [
        { primaryContactId: contact.id },
        ...(contact.companyId ? [{ companyId: contact.companyId }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
  return {
    contact,
    company: contact.company,
    opportunity,
  };
}

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
  if (!(await isActiveProviderConfigured())) {
    throw new Error("El proveedor de IA activo no esta configurado.");
  }
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentAnalyses = await prisma.auditLog.count({
    where: {
      actorId: user.id,
      entityType: "EmailClassification",
      action: AuditAction.CREATE,
      createdAt: { gte: since },
    },
  });
  if (recentAnalyses >= MAX_EMAIL_ANALYSES_PER_HOUR) {
    throw new Error("Alcanzaste el limite de 20 analisis de correo por hora.");
  }

  const message = await prisma.emailMessage.findFirst({
    where: { id: messageId, connection: { userId: user.id } },
  });
  if (!message) {
    throw new Error("El mensaje no esta disponible.");
  }
  const match = await emailCrmMatch(message);
  const analysis = await analyzeEmailWithActiveProvider({
    direction: message.direction,
    fromAddress: message.fromAddress,
    toAddresses: stringArray(message.toAddresses),
    subject: message.subject,
    snippet: message.snippet,
    sentAt: message.sentAt,
    matchedContactName: match.contact?.name,
    matchedCompanyName: match.company?.name,
    matchedOpportunityName: match.opportunity?.name,
  });

  const classification = await prisma.emailClassification.upsert({
    where: { emailMessageId: message.id },
    create: {
      emailMessageId: message.id,
      isCommercial: analysis.isCommercial,
      confidence: analysis.confidence,
      summary: analysis.summary,
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      suggestedNextAction: analysis.suggestedNextAction,
      suggestedDueDate: parsedSuggestedDueDate(analysis.suggestedDueDate),
      matchedContactId: match.contact?.id,
      matchedCompanyId: match.company?.id,
      matchedOpportunityId: match.opportunity?.id,
    },
    update: {
      status: EmailClassificationStatus.PROPOSED,
      isCommercial: analysis.isCommercial,
      confidence: analysis.confidence,
      summary: analysis.summary,
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      suggestedNextAction: analysis.suggestedNextAction,
      suggestedDueDate: parsedSuggestedDueDate(analysis.suggestedDueDate),
      matchedContactId: match.contact?.id,
      matchedCompanyId: match.company?.id,
      matchedOpportunityId: match.opportunity?.id,
      reviewedById: null,
      reviewedAt: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "EmailClassification",
      entityId: classification.id,
      actorId: user.id,
      after: {
        isCommercial: classification.isCommercial,
        confidence: classification.confidence.toString(),
        intent: classification.intent,
      },
    },
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
