"use server";

import { AuditAction, InteractionType, TaskStatus, WhatsAppMessageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { normalizeName } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { emailClassificationResolutionSchema } from "@/schemas/crm";
import { requireWriter } from "@/server/authz";
import { analyzeWhatsAppThread } from "@/server/services/whatsapp-agent";
import { sendWhatsAppTextMessage } from "@/server/services/whatsapp-client";

export async function approveWhatsAppMessage(
  messageId: string,
  formData?: FormData,
) {
  const user = await requireWriter("No tienes permisos para vincular WhatsApp.");
  const message = await prisma.whatsAppMessage.findFirst({
    where: { id: messageId, status: WhatsAppMessageStatus.PENDING },
  });
  if (!message) {
    throw new Error("El mensaje ya no esta disponible.");
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

  await prisma.$transaction(async (tx) => {
    let companyId = resolution?.companyId ?? message.matchedCompanyId;
    let contactId = resolution?.contactId ?? message.matchedContactId;
    let opportunityId = resolution?.opportunityId ?? message.matchedOpportunityId;

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
            after: { name: resolution.newCompanyName, source: "whatsapp" },
          },
        });
      }
    }

    if (!contactId && resolution?.newContactName) {
      const existingContact = await tx.contact.findFirst({
        where: {
          deletedAt: null,
          phone: { contains: message.fromNumber.slice(-8) },
          ...(companyId ? { companyId } : {}),
        },
      });
      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const contact = await tx.contact.create({
          data: {
            name: resolution.newContactName,
            phone: message.fromNumber,
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
            after: { name: contact.name, source: "whatsapp" },
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
          after: { name: opportunity.name, source: "whatsapp" },
        },
      });
    }

    const interaction = await tx.interaction.create({
      data: {
        date: message.timestamp,
        type: InteractionType.WHATSAPP,
        content: message.body ?? "Mensaje de WhatsApp sin texto.",
        contactId,
        companyId,
        opportunityId,
        executedById: user.id,
      },
    });

    await tx.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status: WhatsAppMessageStatus.LINKED,
        matchedCompanyId: companyId,
        matchedContactId: contactId,
        matchedOpportunityId: opportunityId,
        interactionId: interaction.id,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    await Promise.all([
      contactId
        ? tx.contact.updateMany({
            where: {
              id: contactId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: message.timestamp } }],
            },
            data: { lastInteraction: message.timestamp },
          })
        : Promise.resolve(),
      companyId
        ? tx.company.updateMany({
            where: {
              id: companyId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: message.timestamp } }],
            },
            data: { lastInteraction: message.timestamp },
          })
        : Promise.resolve(),
      opportunityId
        ? tx.opportunity.updateMany({
            where: {
              id: opportunityId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: message.timestamp } }],
            },
            data: { lastInteraction: message.timestamp },
          })
        : Promise.resolve(),
    ]);

    await tx.auditLog.create({
      data: {
        action: AuditAction.AI_SUGGESTION_APPROVAL,
        entityType: "WhatsAppMessage",
        entityId: message.id,
        actorId: user.id,
        after: { interactionId: interaction.id },
      },
    });
  });

  revalidatePath("/whatsapp");
  revalidatePath("/interactions");
}

export async function ignoreWhatsAppMessage(messageId: string) {
  const user = await requireWriter("No tienes permisos para ignorar WhatsApp.");
  const message = await prisma.whatsAppMessage.findFirst({
    where: { id: messageId, status: WhatsAppMessageStatus.PENDING },
  });
  if (!message) {
    throw new Error("El mensaje ya no esta disponible.");
  }

  await prisma.$transaction([
    prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status: WhatsAppMessageStatus.IGNORED,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "WhatsAppMessage",
        entityId: message.id,
        actorId: user.id,
        after: { status: WhatsAppMessageStatus.IGNORED },
      },
    }),
  ]);

  revalidatePath("/whatsapp");
}

export async function sendWhatsAppReply(formData: FormData) {
  const user = await requireWriter("No tienes permisos para responder por WhatsApp.");
  const to = (formData.get("to") as string | null)?.trim();
  const body = (formData.get("body") as string | null)?.trim();
  const companyId = (formData.get("companyId") as string | null) || null;
  const contactId = (formData.get("contactId") as string | null) || null;
  const opportunityId = (formData.get("opportunityId") as string | null) || null;
  if (!to || !body) {
    throw new Error("Numero y mensaje son obligatorios.");
  }

  const sent = await sendWhatsAppTextMessage({ to, body });
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const interaction = await tx.interaction.create({
      data: {
        date: now,
        type: InteractionType.WHATSAPP,
        content: body,
        contactId,
        companyId,
        opportunityId,
        executedById: user.id,
      },
    });

    await tx.whatsAppMessage.create({
      data: {
        waMessageId: sent.waMessageId,
        direction: "OUTBOUND",
        fromNumber: "",
        toNumber: to,
        body,
        timestamp: now,
        status: WhatsAppMessageStatus.LINKED,
        matchedCompanyId: companyId,
        matchedContactId: contactId,
        matchedOpportunityId: opportunityId,
        interactionId: interaction.id,
        reviewedById: user.id,
        reviewedAt: now,
      },
    });

    await Promise.all([
      contactId
        ? tx.contact.updateMany({
            where: { id: contactId, OR: [{ lastInteraction: null }, { lastInteraction: { lt: now } }] },
            data: { lastInteraction: now },
          })
        : Promise.resolve(),
      companyId
        ? tx.company.updateMany({
            where: { id: companyId, OR: [{ lastInteraction: null }, { lastInteraction: { lt: now } }] },
            data: { lastInteraction: now },
          })
        : Promise.resolve(),
      opportunityId
        ? tx.opportunity.updateMany({
            where: { id: opportunityId, OR: [{ lastInteraction: null }, { lastInteraction: { lt: now } }] },
            data: { lastInteraction: now },
          })
        : Promise.resolve(),
    ]);

    await tx.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "WhatsAppMessage",
        entityId: interaction.id,
        actorId: user.id,
        after: { to, source: "whatsapp-reply" },
      },
    });
  });

  revalidatePath("/whatsapp");
  revalidatePath("/interactions");
}

export async function discardWhatsAppNumber(phoneNumber: string) {
  const user = await requireWriter("No tienes permisos para crear reglas de WhatsApp.");

  const rule = await prisma.whatsAppDiscardRule.upsert({
    where: { phoneNumber },
    create: { phoneNumber, createdById: user.id },
    update: { isActive: true },
  });

  const pendingMessages = await prisma.whatsAppMessage.findMany({
    where: { fromNumber: phoneNumber, status: WhatsAppMessageStatus.PENDING },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.whatsAppMessage.updateMany({
      where: { id: { in: pendingMessages.map((message) => message.id) } },
      data: {
        status: WhatsAppMessageStatus.IGNORED,
        discardRuleId: rule.id,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.whatsAppDiscardRule.update({
      where: { id: rule.id },
      data: { matchCount: { increment: pendingMessages.length } },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "WhatsAppDiscardRule",
        entityId: rule.id,
        actorId: user.id,
        after: { phoneNumber, discardedMessages: pendingMessages.length },
      },
    }),
  ]);

  revalidatePath("/whatsapp");
  revalidatePath("/whatsapp/rules");
}

export async function toggleWhatsAppDiscardRule(ruleId: string) {
  const user = await requireWriter("No tienes permisos para modificar reglas de WhatsApp.");
  const rule = await prisma.whatsAppDiscardRule.findFirst({ where: { id: ruleId } });
  if (!rule) throw new Error("La regla no esta disponible.");

  await prisma.$transaction([
    prisma.whatsAppDiscardRule.update({
      where: { id: rule.id },
      data: { isActive: !rule.isActive },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "WhatsAppDiscardRule",
        entityId: rule.id,
        actorId: user.id,
        after: { isActive: !rule.isActive },
      },
    }),
  ]);

  revalidatePath("/whatsapp/rules");
}

export async function analyzeWhatsAppConversation(phoneNumber: string) {
  const user = await requireWriter("No tienes permisos para analizar WhatsApp.");
  await analyzeWhatsAppThread({ phoneNumber, actorId: user.id });
  revalidatePath("/whatsapp");
}

export async function confirmWhatsAppTask(phoneNumber: string) {
  const user = await requireWriter("No tienes permisos para crear tareas.");
  const analysis = await prisma.whatsAppThreadAnalysis.findUnique({
    where: { phoneNumber },
  });
  if (!analysis) {
    throw new Error("No hay un analisis disponible para esta conversacion.");
  }
  if (analysis.taskCreatedId) {
    throw new Error("Ya se creo una tarea para esta conversacion.");
  }
  if (!analysis.suggestedNextAction) {
    throw new Error("El analisis no sugiere una proxima accion.");
  }

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: analysis.suggestedNextAction!,
        status: TaskStatus.PENDING,
        dueDate: analysis.suggestedDueDate,
        companyId: analysis.matchedCompanyId,
        contactId: analysis.matchedContactId,
        opportunityId: analysis.matchedOpportunityId,
        assignedToId: user.id,
        createdById: user.id,
      },
    });

    await tx.whatsAppThreadAnalysis.update({
      where: { id: analysis.id },
      data: { taskCreatedId: task.id },
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.AI_SUGGESTION_APPROVAL,
        entityType: "WhatsAppThreadAnalysis",
        entityId: analysis.id,
        actorId: user.id,
        after: { taskId: task.id },
      },
    });
  });

  revalidatePath("/whatsapp");
  revalidatePath("/tasks");
}
