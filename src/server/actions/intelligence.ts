"use server";

import {
  AiInsightStatus,
  AiInsightType,
  AuditAction,
  Prisma,
  TaskStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { clampProbability } from "@/server/services/ai-analysis";
import {
  analyzeInteractionWithActiveProvider,
  analyzeOpportunityWithActiveProvider,
  isActiveProviderConfigured,
} from "@/server/services/ai-provider";
import { requireWriter } from "@/server/authz";

const MAX_AI_REQUESTS_PER_HOUR = 10;
const MIN_INTERACTIONS_FOR_OPPORTUNITY_ANALYSIS = 2;

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function analyzeInteraction(interactionId: string) {
  let insightId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const user = await requireWriter("No tienes permisos para usar inteligencia comercial.");
    if (!(await isActiveProviderConfigured())) {
      errorMessage = "El proveedor de IA activo no esta configurado. Verifica OPENAI_API_KEY en Configuracion.";
    } else {
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
        errorMessage = "Alcanzaste el limite de 10 analisis por hora.";
      } else {
        const interaction = await prisma.interaction.findFirst({
          where: { id: interactionId, deletedAt: null },
          include: { company: true, contact: true, service: true, opportunity: true },
        });
        if (!interaction) {
          errorMessage = "La interaccion ya no esta disponible.";
        } else {
          const analysis = await analyzeInteractionWithActiveProvider({
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
                after: { type: created.type, interactionId: interaction.id, modelReviewed: false },
              },
            });
            return created;
          });

          insightId = insight.id;
          revalidatePath("/intelligence");
          revalidatePath("/interactions");
        }
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Error inesperado al analizar la interaccion.";
  }

  if (errorMessage) {
    redirect(`/intelligence?error=${encodeURIComponent(errorMessage)}`);
  } else {
    redirect(`/intelligence/${insightId}`);
  }
}

export async function analyzeOpportunity(opportunityId: string) {
  let insightId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const user = await requireWriter("No tienes permisos para usar inteligencia comercial.");
    if (!(await isActiveProviderConfigured())) {
      errorMessage = "El proveedor de IA activo no esta configurado. Verifica OPENAI_API_KEY en Configuracion.";
    } else {
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
        errorMessage = "Alcanzaste el limite de 10 analisis por hora.";
      } else {
        const opportunity = await prisma.opportunity.findFirst({
          where: { id: opportunityId, deletedAt: null },
          include: { company: true, service: true },
        });
        if (!opportunity) {
          errorMessage = "La oportunidad ya no esta disponible.";
        } else {
          const interactions = await prisma.interaction.findMany({
            where: { opportunityId: opportunity.id, deletedAt: null },
            orderBy: { date: "asc" },
            take: 30,
          });
          if (interactions.length < MIN_INTERACTIONS_FOR_OPPORTUNITY_ANALYSIS) {
            errorMessage = `Esta oportunidad necesita al menos ${MIN_INTERACTIONS_FOR_OPPORTUNITY_ANALYSIS} interacciones registradas (tiene ${interactions.length}).`;
          } else {
            const analysis = await analyzeOpportunityWithActiveProvider({
              opportunityName: opportunity.name,
              opportunityStatus: opportunity.status,
              opportunityProbability: Number(opportunity.probability),
              companyName: opportunity.company?.name,
              serviceName: opportunity.service?.name,
              interactions: interactions.map((i) => ({
                date: i.date,
                type: i.type,
                content: i.content,
                nextAction: i.nextAction,
              })),
            });

            const insight = await prisma.$transaction(async (tx) => {
              const created = await tx.aiInsight.create({
                data: {
                  type: AiInsightType.OPPORTUNITY_ANALYSIS,
                  status: AiInsightStatus.PROPOSED,
                  opportunityId: opportunity.id,
                  companyId: opportunity.companyId,
                  contactId: opportunity.primaryContactId,
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
                  after: { type: created.type, opportunityId: opportunity.id, interactionsAnalyzed: interactions.length },
                },
              });
              return created;
            });

            insightId = insight.id;
            revalidatePath("/intelligence");
            revalidatePath("/opportunities");
            revalidatePath(`/opportunities/${opportunity.id}`);
          }
        }
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Error inesperado al analizar la oportunidad.";
  }

  if (errorMessage) {
    redirect(`/intelligence?error=${encodeURIComponent(errorMessage)}`);
  } else {
    redirect(`/intelligence/${insightId}`);
  }
}

export async function approveInsight(insightId: string) {
  const user = await requireWriter("No tienes permisos para usar inteligencia comercial.");
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
  const user = await requireWriter("No tienes permisos para usar inteligencia comercial.");
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

export async function deleteInsight(insightId: string) {
  const user = await requireWriter("No tienes permisos para usar inteligencia comercial.");
  const insight = await prisma.aiInsight.findFirst({
    where: {
      id: insightId,
      deletedAt: null,
      status: AiInsightStatus.REJECTED,
    },
  });
  if (!insight) throw new Error("Solo se pueden eliminar analisis rechazados.");

  await prisma.$transaction([
    prisma.aiInsight.update({
      where: { id: insight.id },
      data: { deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "AiInsight",
        entityId: insight.id,
        actorId: user.id,
        before: { status: insight.status },
      },
    }),
  ]);
  revalidatePath("/intelligence");
}
