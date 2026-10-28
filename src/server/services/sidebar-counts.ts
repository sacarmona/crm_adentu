import {
  AiInsightStatus,
  EmailClassificationStatus,
  LeadStatus,
  TaskStatus,
  WhatsAppMessageStatus,
  WebLeadStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getSidebarPendingCounts(userId: string) {
  const [email, whatsapp, webLeads, leads, tasks, intelligence] = await Promise.all([
    prisma.emailMessage.count({
      where: {
        connection: { userId },
        classification: { status: EmailClassificationStatus.PROPOSED },
      },
    }),
    prisma.whatsAppMessage.count({
      where: { status: WhatsAppMessageStatus.PENDING },
    }),
    prisma.webLead.count({ where: { status: WebLeadStatus.PENDING } }),
    prisma.lead.count({ where: { deletedAt: null, status: LeadStatus.NUEVO } }),
    prisma.task.count({
      where: { deletedAt: null, status: TaskStatus.PENDING, assignedToId: userId },
    }),
    prisma.aiInsight.count({
      where: { deletedAt: null, status: AiInsightStatus.PROPOSED },
    }),
  ]);

  return { email, whatsapp, webLeads, leads, tasks, intelligence };
}
