"use server";

import { AuditAction, InteractionType, TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { linkedInCaptureSchema } from "@/schemas/crm";
import { requireWriter } from "@/server/authz";
import { parseLocalDateTime } from "@/server/services/activity";
import { linkedinInteractionContent } from "@/server/services/linkedin-capture";

export async function createLinkedInCapture(formData: FormData) {
  const user = await requireWriter(
    "No tienes permisos para registrar actividad de LinkedIn.",
  );
  const data = linkedInCaptureSchema.parse(
    Object.fromEntries(formData.entries()),
  );
  const date = parseLocalDateTime(data.date);
  const nextActionDate = parseLocalDateTime(data.nextActionDate);
  if (!date) {
    throw new Error("La fecha de la captura no es valida.");
  }

  const interaction = await prisma.$transaction(async (tx) => {
    const created = await tx.interaction.create({
      data: {
        date,
        type: InteractionType.LINKEDIN,
        content: linkedinInteractionContent(data),
        companyId: data.companyId,
        contactId: data.contactId,
        opportunityId: data.opportunityId,
        serviceId: data.serviceId,
        executedById: user.id,
        nextAction: data.nextAction,
        nextActionDate,
        nextActionDueDate: nextActionDate,
        nextActionStatus: data.nextAction ? TaskStatus.PENDING : null,
      },
    });
    if (data.nextAction) {
      await tx.task.create({
        data: {
          title: data.nextAction,
          status: TaskStatus.PENDING,
          dueDate: nextActionDate,
          companyId: data.companyId,
          contactId: data.contactId,
          opportunityId: data.opportunityId,
          interactionId: created.id,
          serviceId: data.serviceId,
          assignedToId: user.id,
          createdById: user.id,
        },
      });
    }
    await Promise.all([
      data.companyId
        ? tx.company.updateMany({
            where: {
              id: data.companyId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
      data.contactId
        ? tx.contact.updateMany({
            where: {
              id: data.contactId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
      data.opportunityId
        ? tx.opportunity.updateMany({
            where: {
              id: data.opportunityId,
              OR: [{ lastInteraction: null }, { lastInteraction: { lt: date } }],
            },
            data: { lastInteraction: date },
          })
        : Promise.resolve(),
      data.opportunityId && nextActionDate
        ? tx.opportunity.update({
            where: { id: data.opportunityId },
            data: { nextActionDate },
          })
        : Promise.resolve(),
    ]);
    await tx.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "LinkedInCapture",
        entityId: created.id,
        actorId: user.id,
        after: {
          sourceUrl: data.sourceUrl,
          personName: data.personName,
          organizationName: data.organizationName,
          hasNextAction: Boolean(data.nextAction),
        },
      },
    });
    return created;
  });

  revalidatePath("/linkedin");
  revalidatePath("/interactions");
  revalidatePath("/tasks");
  redirect(`/linkedin?created=${interaction.id}`);
}
