import {
  AuditAction,
  EmailClassificationStatus,
  OpportunityStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  analyzeEmailWithActiveProvider,
  isActiveProviderConfigured,
} from "@/server/services/ai-provider";
import { parsedSuggestedDueDate } from "@/server/services/email-analysis";
import { applyDiscardRulesForUser } from "@/server/services/email-discard-rules";

const MAX_EMAIL_ANALYSES_PER_HOUR = 20;

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function extractDomain(address: string) {
  return address.split("@")[1]?.toLowerCase().trim() ?? "";
}

async function findCompanyByDomain(domain: string) {
  if (!domain) return null;
  return prisma.company.findFirst({
    where: {
      deletedAt: null,
      contacts: {
        some: {
          deletedAt: null,
          email: { endsWith: `@${domain}`, mode: "insensitive" },
        },
      },
    },
  });
}

async function findActiveOpportunityForCompany(companyId: string) {
  return prisma.opportunity.findFirst({
    where: {
      deletedAt: null,
      companyId,
      status: { notIn: [OpportunityStatus.WON, OpportunityStatus.LOST] },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Fuzzy candidates (domain or name match) for the manual resolution UI.
 * Distinct from emailCrmMatch's exact-domain auto-match: these are
 * suggestions only, never assigned without user confirmation.
 */
export async function findCompanyCandidates(fromAddress: string) {
  const domain = extractDomain(fromAddress);
  if (!domain) return [];
  const root = domain.split(".")[0] ?? "";
  return prisma.company.findMany({
    where: {
      deletedAt: null,
      OR: [
        {
          contacts: {
            some: {
              deletedAt: null,
              email: { endsWith: `@${domain}`, mode: "insensitive" },
            },
          },
        },
        ...(root.length >= 3 ? [{ normalizedName: { contains: root } }] : []),
      ],
    },
    orderBy: { name: "asc" },
    take: 5,
  });
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
  if (contact) {
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
    return { contact, company: contact.company, opportunity };
  }

  const primaryAddress = addresses[0];
  const company = primaryAddress
    ? await findCompanyByDomain(extractDomain(primaryAddress))
    : null;
  if (!company) {
    return { contact: null, company: null, opportunity: null };
  }
  const opportunity = await findActiveOpportunityForCompany(company.id);
  return { contact: null, company, opportunity };
}

export async function classifyEmailMessage(input: {
  messageId: string;
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
        entityType: "EmailClassification",
        action: AuditAction.CREATE,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentAnalyses >= MAX_EMAIL_ANALYSES_PER_HOUR) {
      throw new Error("Alcanzaste el limite de 20 analisis de correo por hora.");
    }
  }

  const message = await prisma.emailMessage.findFirst({
    where: {
      id: input.messageId,
      connection: { userId: input.actorId },
    },
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
      actorId: input.actorId,
      after: {
        automatic: input.enforceHourlyLimit === false,
        isCommercial: classification.isCommercial,
        confidence: classification.confidence.toString(),
        intent: classification.intent,
      },
    },
  });
  return classification;
}

export async function classifyPendingEmails(input: {
  userId: string;
  limit: number;
  enforceHourlyLimit?: boolean;
}) {
  await applyDiscardRulesForUser(input.userId);
  const messages = await prisma.emailMessage.findMany({
    where: {
      connection: { userId: input.userId },
      classification: null,
      sentAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { sentAt: "desc" },
    take: input.limit,
    select: { id: true },
  });
  const results = [];
  for (const message of messages) {
    try {
      await classifyEmailMessage({
        messageId: message.id,
        actorId: input.userId,
        enforceHourlyLimit: input.enforceHourlyLimit,
      });
      results.push({ id: message.id, status: "classified" as const });
    } catch (error) {
      results.push({
        id: message.id,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
  return results;
}
