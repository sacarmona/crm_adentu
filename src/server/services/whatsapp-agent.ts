import { AuditAction, WhatsAppDirection } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  analyzeEmailWithActiveProvider,
  isActiveProviderConfigured,
} from "@/server/services/ai-provider";
import { parsedSuggestedDueDate } from "@/server/services/email-analysis";

const MAX_WHATSAPP_ANALYSES_PER_HOUR = 20;

function threadMessagesWhere(phoneNumber: string) {
  return {
    OR: [
      { direction: WhatsAppDirection.INBOUND, fromNumber: phoneNumber },
      { direction: WhatsAppDirection.OUTBOUND, toNumber: phoneNumber },
    ],
  };
}

export async function analyzeWhatsAppThread(input: {
  phoneNumber: string;
  actorId: string;
  enforceHourlyLimit?: boolean;
}) {
  if (!(await isActiveProviderConfigured())) {
    throw new Error("El proveedor de IA activo no esta configurado.");
  }
  if (input.enforceHourlyLimit !== false) {
    const recentAnalyses = await prisma.auditLog.count({
      where: {
        actorId: input.actorId,
        entityType: "WhatsAppThreadAnalysis",
        action: AuditAction.CREATE,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentAnalyses >= MAX_WHATSAPP_ANALYSES_PER_HOUR) {
      throw new Error("Alcanzaste el limite de 20 analisis de WhatsApp por hora.");
    }
  }

  const messages = await prisma.whatsAppMessage.findMany({
    where: threadMessagesWhere(input.phoneNumber),
    orderBy: { timestamp: "asc" },
  });
  if (messages.length === 0) {
    throw new Error("No hay mensajes para esta conversacion.");
  }

  const transcript = messages
    .map(
      (message) =>
        `[${message.timestamp.toISOString()}] ${
          message.direction === WhatsAppDirection.INBOUND ? "Cliente" : "ADENTU"
        }: ${message.body ?? "(mensaje sin texto)"}`,
    )
    .join("\n");

  const matchedContactId = messages.findLast((m) => m.matchedContactId)?.matchedContactId ?? null;
  const matchedCompanyId = messages.findLast((m) => m.matchedCompanyId)?.matchedCompanyId ?? null;
  const matchedOpportunityId =
    messages.findLast((m) => m.matchedOpportunityId)?.matchedOpportunityId ?? null;

  const [matchedContact, matchedCompany, matchedOpportunity] = await Promise.all([
    matchedContactId ? prisma.contact.findUnique({ where: { id: matchedContactId } }) : null,
    matchedCompanyId ? prisma.company.findUnique({ where: { id: matchedCompanyId } }) : null,
    matchedOpportunityId
      ? prisma.opportunity.findUnique({ where: { id: matchedOpportunityId } })
      : null,
  ]);

  const lastMessage = messages[messages.length - 1];
  const analysis = await analyzeEmailWithActiveProvider({
    direction: lastMessage.direction,
    fromAddress: input.phoneNumber,
    toAddresses: [],
    subject: null,
    snippet: transcript,
    sentAt: lastMessage.timestamp,
    matchedContactName: matchedContact?.name,
    matchedCompanyName: matchedCompany?.name,
    matchedOpportunityName: matchedOpportunity?.name,
    channel: "whatsapp",
  });

  const threadAnalysis = await prisma.whatsAppThreadAnalysis.upsert({
    where: { phoneNumber: input.phoneNumber },
    create: {
      phoneNumber: input.phoneNumber,
      isCommercial: analysis.isCommercial,
      confidence: analysis.confidence,
      summary: analysis.summary,
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      suggestedNextAction: analysis.suggestedNextAction,
      suggestedDueDate: parsedSuggestedDueDate(analysis.suggestedDueDate),
      matchedContactId,
      matchedCompanyId,
      matchedOpportunityId,
      analyzedById: input.actorId,
    },
    update: {
      isCommercial: analysis.isCommercial,
      confidence: analysis.confidence,
      summary: analysis.summary,
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      suggestedNextAction: analysis.suggestedNextAction,
      suggestedDueDate: parsedSuggestedDueDate(analysis.suggestedDueDate),
      matchedContactId,
      matchedCompanyId,
      matchedOpportunityId,
      analyzedById: input.actorId,
      analyzedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "WhatsAppThreadAnalysis",
      entityId: threadAnalysis.id,
      actorId: input.actorId,
      after: {
        phoneNumber: input.phoneNumber,
        isCommercial: threadAnalysis.isCommercial,
        confidence: threadAnalysis.confidence.toString(),
        intent: threadAnalysis.intent,
      },
    },
  });

  return threadAnalysis;
}
