"use server";

import {
  AuditAction,
  EmailClassificationStatus,
  EmailDraftStatus,
  InteractionType,
  TaskStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/normalize";
import { emailClassificationResolutionSchema } from "@/schemas/crm";
import { requireAdmin, requireWriter } from "@/server/authz";
import {
  classifyEmailMessage,
  classifyPendingEmails,
} from "@/server/services/email-agent";
import { generateEmailDraftWithActiveProvider } from "@/server/services/ai-provider";
import { emailDraftFormSchema } from "@/server/services/email-draft";
import {
  applyDiscardRulesForUser,
  discardRuleValue,
  emailDiscardRuleSchema,
} from "@/server/services/email-discard-rules";
import { synchronizeEmailConnection } from "@/server/services/email-sync";
import { syncTaskCalendarEvent } from "@/server/services/task-calendar-sync";

export async function syncEmailConnection(connectionId: string) {
  const user = await requireWriter("No tienes permisos para sincronizar correo.");
  try {
    await synchronizeEmailConnection(connectionId, user.id);
  } catch {
    // The sync service persists a safe operational error for display.
  }
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

export async function approveEmailClassification(
  classificationId: string,
  formData?: FormData,
) {
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

  const resolution = formData
    ? emailClassificationResolutionSchema.parse({
        companyId: formData.get("companyId") ?? undefined,
        newCompanyName: formData.get("newCompanyName") ?? undefined,
        contactId: formData.get("contactId") ?? undefined,
        newContactName: formData.get("newContactName") ?? undefined,
        newContactEmail: formData.get("newContactEmail") ?? undefined,
        opportunityId: formData.get("opportunityId") ?? undefined,
        newOpportunityName: formData.get("newOpportunityName") ?? undefined,
        newOpportunityServiceId: formData.get("newOpportunityServiceId") ?? undefined,
      })
    : null;

  const result = await prisma.$transaction(async (tx) => {
    let companyId = resolution?.companyId ?? classification.matchedCompanyId;
    let contactId = resolution?.contactId ?? classification.matchedContactId;
    let opportunityId =
      resolution?.opportunityId ?? classification.matchedOpportunityId;

    if (!companyId && resolution?.newCompanyName) {
      const normalizedName = normalizeName(resolution.newCompanyName);
      const existingCompany = await tx.company.findFirst({
        where: { deletedAt: null, normalizedName },
      });
      companyId = existingCompany
        ? existingCompany.id
        : (
            await tx.company.create({
              data: { name: resolution.newCompanyName, normalizedName },
            })
          ).id;
      if (!existingCompany) {
        await tx.auditLog.create({
          data: {
            action: AuditAction.CREATE,
            entityType: "Company",
            entityId: companyId,
            actorId: user.id,
            after: { name: resolution.newCompanyName, source: "email-classification" },
          },
        });
      }
    }

    if (!contactId && resolution?.newContactName) {
      const newContactEmail =
        resolution.newContactEmail ?? classification.emailMessage.fromAddress;
      const existingContact = await tx.contact.findFirst({
        where: {
          deletedAt: null,
          email: { equals: newContactEmail, mode: "insensitive" },
          ...(companyId ? { companyId } : {}),
        },
      });
      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const contact = await tx.contact.create({
          data: {
            name: resolution.newContactName,
            email: newContactEmail,
            companyId,
          },
        });
        contactId = contact.id;
        await tx.auditLog.create({
          data: {
            action: AuditAction.CREATE,
            entityType: "Contact",
            entityId: contact.id,
            actorId: user.id,
            after: { name: contact.name, source: "email-classification" },
          },
        });
      }
    }

    if (!opportunityId && resolution?.newOpportunityName) {
      const opportunity = await tx.opportunity.create({
        data: {
          name: resolution.newOpportunityName,
          companyId,
          primaryContactId: contactId,
          serviceId: resolution.newOpportunityServiceId,
        },
      });
      opportunityId = opportunity.id;
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          entityType: "Opportunity",
          entityId: opportunity.id,
          actorId: user.id,
          after: { name: opportunity.name, source: "email-classification" },
        },
      });
    }

    const interaction = await tx.interaction.create({
      data: {
        date: classification.emailMessage.sentAt,
        type: InteractionType.EMAIL,
        content: classification.summary,
        contactId,
        companyId,
        opportunityId,
        executedById: user.id,
        nextAction: classification.suggestedNextAction,
        nextActionDate: classification.suggestedDueDate,
        nextActionDueDate: classification.suggestedDueDate,
        nextActionStatus: classification.suggestedNextAction
          ? TaskStatus.PENDING
          : null,
      },
    });
    const task = classification.suggestedNextAction
      ? await tx.task.create({
          data: {
            title: classification.suggestedNextAction,
            status: TaskStatus.PENDING,
            dueDate: classification.suggestedDueDate,
            contactId,
            companyId,
            opportunityId,
            interactionId: interaction.id,
            assignedToId: user.id,
            createdById: user.id,
          },
        })
      : null;
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
        matchedCompanyId: companyId,
        matchedContactId: contactId,
        matchedOpportunityId: opportunityId,
      },
    });
    await Promise.all([
      contactId
        ? tx.contact.updateMany({
            where: {
              id: contactId,
              OR: [
                { lastInteraction: null },
                { lastInteraction: { lt: classification.emailMessage.sentAt } },
              ],
            },
            data: { lastInteraction: classification.emailMessage.sentAt },
          })
        : Promise.resolve(),
      companyId
        ? tx.company.updateMany({
            where: {
              id: companyId,
              OR: [
                { lastInteraction: null },
                { lastInteraction: { lt: classification.emailMessage.sentAt } },
              ],
            },
            data: { lastInteraction: classification.emailMessage.sentAt },
          })
        : Promise.resolve(),
      opportunityId
        ? tx.opportunity.updateMany({
            where: {
              id: opportunityId,
              OR: [
                { lastInteraction: null },
                { lastInteraction: { lt: classification.emailMessage.sentAt } },
              ],
            },
            data: { lastInteraction: classification.emailMessage.sentAt },
          })
        : Promise.resolve(),
      opportunityId && classification.suggestedDueDate
        ? tx.opportunity.update({
            where: { id: opportunityId },
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
    return { taskId: task?.id };
  });

  if (result.taskId) {
    await syncTaskCalendarEvent(result.taskId);
  }

  revalidatePath("/email");
  revalidatePath(`/email/${classification.emailMessageId}`);
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

export async function generateEmailDraft(messageId: string) {
  const user = await requireWriter("No tienes permisos para generar borradores.");
  const recentDrafts = await prisma.auditLog.count({
    where: {
      actorId: user.id,
      entityType: "EmailDraft",
      action: AuditAction.CREATE,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recentDrafts >= 20) {
    throw new Error("Alcanzaste el limite de 20 borradores por hora.");
  }
  const message = await prisma.emailMessage.findFirst({
    where: {
      id: messageId,
      direction: "INBOUND",
      connection: { userId: user.id },
      classification: { isCommercial: true },
    },
    include: { classification: true },
  });
  if (!message?.classification) {
    throw new Error("El correo debe tener una clasificacion comercial.");
  }
  const [contact, company, opportunity] = await Promise.all([
    message.classification.matchedContactId
      ? prisma.contact.findUnique({
          where: { id: message.classification.matchedContactId },
          select: { name: true },
        })
      : null,
    message.classification.matchedCompanyId
      ? prisma.company.findUnique({
          where: { id: message.classification.matchedCompanyId },
          select: { name: true },
        })
      : null,
    message.classification.matchedOpportunityId
      ? prisma.opportunity.findUnique({
          where: { id: message.classification.matchedOpportunityId },
          select: { name: true },
        })
      : null,
  ]);
  const suggestion = await generateEmailDraftWithActiveProvider({
    originalSubject: message.subject,
    originalSnippet: message.snippet,
    senderName: message.fromName,
    senderAddress: message.fromAddress,
    classificationSummary: message.classification.summary,
    intent: message.classification.intent,
    suggestedNextAction: message.classification.suggestedNextAction,
    contactName: contact?.name,
    companyName: company?.name,
    opportunityName: opportunity?.name,
  });
  const draft = await prisma.emailDraft.upsert({
    where: { emailMessageId: message.id },
    create: {
      emailMessageId: message.id,
      subject: suggestion.subject,
      body: suggestion.body,
    },
    update: {
      status: EmailDraftStatus.DRAFT,
      subject: suggestion.subject,
      body: suggestion.body,
      reviewedById: null,
      reviewedAt: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "EmailDraft",
      entityId: draft.id,
      actorId: user.id,
      after: { subject: draft.subject, status: draft.status },
    },
  });
  revalidatePath(`/email/${message.id}`);
  revalidatePath("/email");
}

export async function saveEmailDraft(formData: FormData) {
  const user = await requireWriter("No tienes permisos para editar borradores.");
  const data = emailDraftFormSchema.parse(Object.fromEntries(formData.entries()));
  const draft = await prisma.emailDraft.findFirst({
    where: {
      id: data.draftId,
      emailMessage: { connection: { userId: user.id } },
    },
  });
  if (!draft) {
    throw new Error("El borrador no esta disponible.");
  }
  await prisma.emailDraft.update({
    where: { id: draft.id },
    data: {
      status: EmailDraftStatus.DRAFT,
      subject: data.subject,
      body: data.body,
      reviewedById: null,
      reviewedAt: null,
    },
  });
  revalidatePath(`/email/${draft.emailMessageId}`);
}

export async function approveEmailDraft(formData: FormData) {
  const user = await requireWriter("No tienes permisos para aprobar borradores.");
  const data = emailDraftFormSchema.parse(Object.fromEntries(formData.entries()));
  const draft = await prisma.emailDraft.findFirst({
    where: {
      id: data.draftId,
      emailMessage: { connection: { userId: user.id } },
    },
  });
  if (!draft) {
    throw new Error("El borrador no esta disponible.");
  }
  await prisma.$transaction([
    prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        status: EmailDraftStatus.APPROVED,
        subject: data.subject,
        body: data.body,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.AI_SUGGESTION_APPROVAL,
        entityType: "EmailDraft",
        entityId: draft.id,
        actorId: user.id,
        after: { status: EmailDraftStatus.APPROVED },
      },
    }),
  ]);
  revalidatePath(`/email/${draft.emailMessageId}`);
  revalidatePath("/email");
}

export async function discardEmailDraft(draftId: string) {
  const user = await requireWriter("No tienes permisos para descartar borradores.");
  const draft = await prisma.emailDraft.findFirst({
    where: {
      id: draftId,
      emailMessage: { connection: { userId: user.id } },
    },
  });
  if (!draft) {
    throw new Error("El borrador no esta disponible.");
  }
  await prisma.$transaction([
    prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        status: EmailDraftStatus.DISCARDED,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "EmailDraft",
        entityId: draft.id,
        actorId: user.id,
        after: { status: EmailDraftStatus.DISCARDED },
      },
    }),
  ]);
  revalidatePath(`/email/${draft.emailMessageId}`);
  revalidatePath("/email");
}

export async function discardEmailMessage(messageId: string) {
  const user = await requireWriter("No tienes permisos para descartar correo.");
  const message = await prisma.emailMessage.findFirst({
    where: { id: messageId, connection: { userId: user.id } },
  });
  if (!message) throw new Error("El mensaje no esta disponible.");

  await prisma.emailClassification.upsert({
    where: { emailMessageId: message.id },
    create: {
      emailMessageId: message.id,
      status: EmailClassificationStatus.IGNORED,
      isCommercial: false,
      confidence: 1,
      summary: "Descartado manualmente por el usuario.",
      intent: "OTHER",
      sentiment: "NEUTRAL",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
    update: {
      status: EmailClassificationStatus.IGNORED,
      isCommercial: false,
      confidence: 1,
      summary: "Descartado manualmente por el usuario.",
      intent: "OTHER",
      sentiment: "NEUTRAL",
      discardRuleId: null,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "EmailMessage",
      entityId: message.id,
      actorId: user.id,
      after: { discarded: true, ruleCreated: false },
    },
  });
  revalidatePath("/email");
  revalidatePath(`/email/${message.id}`);
}

export async function createDiscardRuleFromMessage(formData: FormData) {
  const user = await requireWriter("No tienes permisos para crear reglas.");
  const data = emailDiscardRuleSchema.parse(
    Object.fromEntries(formData.entries()),
  );
  const message = await prisma.emailMessage.findFirst({
    where: { id: data.messageId, connection: { userId: user.id } },
  });
  if (!message) throw new Error("El mensaje no esta disponible.");

  const value = discardRuleValue({
    type: data.type,
    fromAddress: message.fromAddress,
    subject: message.subject,
  });
  const rule = await prisma.emailDiscardRule.upsert({
    where: {
      userId_type_value_direction: {
        userId: user.id,
        type: data.type,
        value,
        direction: message.direction,
      },
    },
    create: {
      userId: user.id,
      type: data.type,
      value,
      direction: message.direction,
    },
    update: { isActive: true },
  });
  await prisma.$transaction([
    prisma.emailClassification.upsert({
      where: { emailMessageId: message.id },
      create: {
        emailMessageId: message.id,
        status: EmailClassificationStatus.IGNORED,
        isCommercial: false,
        confidence: 1,
        summary: `Descartado por regla: ${value}`,
        intent: "OTHER",
        sentiment: "NEUTRAL",
        discardRuleId: rule.id,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      update: {
        status: EmailClassificationStatus.IGNORED,
        isCommercial: false,
        confidence: 1,
        summary: `Descartado por regla: ${value}`,
        intent: "OTHER",
        sentiment: "NEUTRAL",
        discardRuleId: rule.id,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "EmailDiscardRule",
        entityId: rule.id,
        actorId: user.id,
        after: {
          type: rule.type,
          value: rule.value,
          direction: rule.direction,
        },
      },
    }),
    prisma.emailDiscardRule.update({
      where: { id: rule.id },
      data: { matchCount: { increment: 1 } },
    }),
  ]);
  await applyDiscardRulesForUser(user.id);
  revalidatePath("/email");
  revalidatePath("/email/rules");
  revalidatePath(`/email/${message.id}`);
}

export async function restoreDiscardedEmail(messageId: string) {
  const user = await requireWriter("No tienes permisos para restaurar correo.");
  const classification = await prisma.emailClassification.findFirst({
    where: {
      emailMessageId: messageId,
      status: EmailClassificationStatus.IGNORED,
      emailMessage: { connection: { userId: user.id } },
    },
  });
  if (!classification) throw new Error("El correo no esta descartado.");
  await prisma.$transaction([
    prisma.emailClassification.delete({ where: { id: classification.id } }),
    ...(classification.discardRuleId
      ? [
          prisma.emailDiscardRule.update({
            where: { id: classification.discardRuleId },
            data: { isActive: false },
          }),
        ]
      : []),
  ]);
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "EmailMessage",
      entityId: messageId,
      actorId: user.id,
      after: { restored: true },
    },
  });
  revalidatePath("/email");
  revalidatePath(`/email/${messageId}`);
}

export async function deleteRuleDiscardedEmails() {
  const user = await requireAdmin(
    "Solo ADMIN puede eliminar correos descartados de forma permanente.",
  );
  const connections = await prisma.emailConnection.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const where = {
    connectionId: { in: connections.map((connection) => connection.id) },
    classification: {
      status: EmailClassificationStatus.IGNORED,
      discardRuleId: { not: null },
    },
  };
  const toDelete = await prisma.emailMessage.findMany({
    where,
    select: { id: true },
  });
  if (toDelete.length === 0) {
    revalidatePath("/email");
    return;
  }

  const deleted = await prisma.emailMessage.deleteMany({ where });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.SOFT_DELETE,
      entityType: "EmailMessage",
      entityId: "bulk",
      actorId: user.id,
      after: {
        deleted: deleted.count,
        reason: "rule-discarded",
        messageIds: toDelete.map((message) => message.id),
      },
    },
  });
  revalidatePath("/email");
}

export async function toggleDiscardRule(ruleId: string) {
  const user = await requireWriter("No tienes permisos para modificar reglas.");
  const rule = await prisma.emailDiscardRule.findFirst({
    where: { id: ruleId, userId: user.id },
  });
  if (!rule) throw new Error("La regla no esta disponible.");
  await prisma.emailDiscardRule.update({
    where: { id: rule.id },
    data: { isActive: !rule.isActive },
  });
  if (!rule.isActive) {
    await applyDiscardRulesForUser(user.id);
  }
  revalidatePath("/email/rules");
}
