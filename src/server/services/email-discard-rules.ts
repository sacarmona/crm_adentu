import {
  CommercialSentiment,
  EmailClassificationStatus,
  EmailCommercialIntent,
  EmailDirection,
  EmailDiscardRuleType,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "../../lib/prisma";

export const emailDiscardRuleSchema = z.object({
  messageId: z.string().uuid(),
  type: z.nativeEnum(EmailDiscardRuleType),
});

export function senderDomain(address: string) {
  const domain = address.trim().toLowerCase().split("@")[1];
  return domain && domain.includes(".") ? domain : null;
}

export function discardRuleValue(input: {
  type: EmailDiscardRuleType;
  fromAddress: string;
  subject?: string | null;
}) {
  if (input.type === EmailDiscardRuleType.SENDER_EXACT) {
    return input.fromAddress.trim().toLowerCase();
  }
  if (input.type === EmailDiscardRuleType.SENDER_DOMAIN) {
    const domain = senderDomain(input.fromAddress);
    if (!domain) throw new Error("El remitente no tiene un dominio valido.");
    return domain;
  }
  const subject = input.subject?.trim().toLowerCase();
  if (!subject || subject.length < 4) {
    throw new Error("El asunto debe tener al menos 4 caracteres.");
  }
  return subject.slice(0, 200);
}

export function ruleMatchesMessage(
  rule: {
    type: EmailDiscardRuleType;
    value: string;
    direction: EmailDirection | null;
  },
  message: {
    direction: EmailDirection;
    fromAddress: string;
    subject: string | null;
  },
) {
  if (rule.direction && rule.direction !== message.direction) return false;
  const value = rule.value.toLowerCase();
  if (rule.type === EmailDiscardRuleType.SENDER_EXACT) {
    return message.fromAddress.toLowerCase() === value;
  }
  if (rule.type === EmailDiscardRuleType.SENDER_DOMAIN) {
    return senderDomain(message.fromAddress) === value;
  }
  return Boolean(message.subject?.toLowerCase().includes(value));
}

export async function applyDiscardRulesForUser(userId: string) {
  const [rules, messages] = await Promise.all([
    prisma.emailDiscardRule.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.emailMessage.findMany({
      where: {
        connection: { userId },
        classification: null,
      },
      select: {
        id: true,
        direction: true,
        fromAddress: true,
        subject: true,
      },
    }),
  ]);

  let applied = 0;
  for (const message of messages) {
    const rule = rules.find((candidate) =>
      ruleMatchesMessage(candidate, message),
    );
    if (!rule) continue;
    await prisma.$transaction([
      prisma.emailClassification.create({
        data: {
          emailMessageId: message.id,
          status: EmailClassificationStatus.IGNORED,
          isCommercial: false,
          confidence: 1,
          summary: `Descartado automaticamente por regla: ${rule.value}`,
          intent: EmailCommercialIntent.OTHER,
          sentiment: CommercialSentiment.NEUTRAL,
          discardRuleId: rule.id,
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      }),
      prisma.emailDiscardRule.update({
        where: { id: rule.id },
        data: { matchCount: { increment: 1 } },
      }),
    ]);
    applied += 1;
  }
  return applied;
}
