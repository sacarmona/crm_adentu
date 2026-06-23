"use server";

import {
  AiInsightStatus,
  AiInsightType,
  AuditAction,
  Prisma,
  TaskStatus,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clampProbability } from "@/server/services/ai-analysis";
import {
  analyzeCommercialInteraction,
  isAiConfigured,
} from "@/server/services/openai";

const MAX_AI_REQUESTS_PER_HOUR = 10;

async function requireWriter() {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.COMERCIAL)
  ) {
    throw new Error("No tienes permisos para usar inteligencia comercial.");
  }
  return session.user;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function analyzeInteraction(interactionId: string) {
  const user = await requireWriter();
  if (!isAiConfigured()) {
    throw new Error("La integracion OpenAI no esta configurada.");
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentRequests = await prisma.auditLog.count({
    where: {
      actorId: user.id,
      entityType: "AiInsight",
      action: AuditAction.CREATE,
      createdAt: { gte: since },
    },
  });
  if (recentRequests >= MAX_AI_REQUESTS_PER_HOUR) {
    throw new Error("Alcanzaste el limite de 10 analisis por hora.");
  }

  const interaction = await prisma.interaction.findFirst({
    where: { id: interactionId, deletedAt: null },
    include: {
      company: true,
      contact: true,
      service: true,
      opportunity: true,
    },
  });
  if (!interaction) throw new Error("La interaccion ya no esta disponible.");

  const analysis = await analyzeCommercialInteraction({
    interactionType: interaction.type,
    interactionDate: interaction.date,
    content: interaction.content,
    nextAction: interaction.nextAction,
    companyName: interaction.company?.name,
    contactName: interaction.contact?.name,
    opportunityName: interaction.opportunity?.name,
    opportunityStatus: interaction.opportunity?.status,
    opportunityProbability: interaction.opportunity
      ? Number(interaction.opportunity.probability)
      : null,
    serviceName: interaction.service?.name,
  });

  const insight = await prisma.$transaction(async (tx) => {
    const created = await tx.aiInsight.create({
      data: {
        type: AiInsightType.INTERACTION_ANALYSIS,
        status: AiInsightStatus.PROPOSED,
        interactionId: interaction.id,
        companyId: interaction.companyId,
        contactId: interaction.contactId,
        opportunityId: interaction.opportunityId,
        summary: analysis.summary,
        customerInterests: json(analysis.customerInterests),
        objections: json(analysis.objections),
        commitments: json(analysis.commitments),
        risks: json(analysis.risks),
        suggestedNextSteps: json(analysis.suggestedNextSteps),
        mentionedServices: json(analysis.mentionedServices),
        sentiment: analysis.sentiment,
        suggestedAdvanceProbability: clampProbability(
          analysis.suggestedAdvanceProbability,
        ),
        suggestedChanges: json(analysis.suggestedChanges),
      },
    });
    await tx.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "AiInsight",
        entityId: created.id,
        actorId: user.id,
        after: {
          type: created.type,
          interactionId: interaction.id,
          modelReviewed: false,
        },
      },
    });
    return created;
  });

  revalidatePath("/intelligence");
  revalidatePath("/interactions");
  redirect(`/intelligence/${insight.id}`);
}

export async function approveInsight(insightId: string) {
  const user = await requireWriter();
  const insight = await prisma.aiInsight.findFirst({
    where: {
      id: insightId,
      deletedAt: null,
      status: AiInsightStatus.PROPOSED,
    },
  });
  if (!insight) throw new Error("La sugerencia ya no esta pendiente.");

  await prisma.$transaction(async (tx) => {
    if (insight.opportunityId && insight.suggestedAdvanceProbability != null) {
      await tx.opportunity.update({
        where: { id: insight.opportunityId },
        data: { probability: insight.suggestedAdvanceProbability },
      });
    }

    const suggestedChanges = insight.suggestedChanges as {
      nextAction?: string | null;
    } | null;
    if (insight.opportunityId && suggestedChanges?.nextAction) {
      const opportunity = await tx.opportunity.findUnique({
        where: { id: insight.opportunityId },
      });
      await tx.task.create({
        data: {
          title: suggestedChanges.nextAction,
          status: TaskStatus.PENDING,
          opportunityId: insight.opportunityId,
          companyId: opportunity?.companyId,
          contactId: opportunity?.primaryContactId,
          serviceId: opportunity?.serviceId,
          assignedToId: opportunity?.responsibleId ?? user.id,
          createdById: user.id,
        },
      });
    }

    await tx.aiInsight.update({
      where: { id: insight.id },
      data: {
        status: AiInsightStatus.APPROVED,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        action: AuditAction.AI_SUGGESTION_APPROVAL,
        entityType: "AiInsight",
        entityId: insight.id,
        actorId: user.id,
        before: { status: insight.status },
        after: { status: AiInsightStatus.APPROVED },
      },
    });
  });

  revalidatePath("/intelligence");
  revalidatePath(`/intelligence/${insight.id}`);
  revalidatePath("/opportunities");
  revalidatePath("/tasks");
  redirect(`/intelligence/${insight.id}`);
}

export async function rejectInsight(insightId: string) {
  const user = await requireWriter();
  const insight = await prisma.aiInsight.findFirst({
    where: {
      id: insightId,
      deletedAt: null,
      status: AiInsightStatus.PROPOSED,
    },
  });
  if (!insight) throw new Error("La sugerencia ya no esta pendiente.");

  await prisma.$transaction([
    prisma.aiInsight.update({
      where: { id: insight.id },
      data: { status: AiInsightStatus.REJECTED },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "AiInsight",
        entityId: insight.id,
        actorId: user.id,
        before: { status: insight.status },
        after: { status: AiInsightStatus.REJECTED },
      },
    }),
  ]);
  revalidatePath("/intelligence");
  redirect("/intelligence");
}
