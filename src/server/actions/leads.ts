"use server";

import { AuditAction, LeadStatus, OpportunityStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeName, nullableDate } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { leadContactLogSchema, leadSchema } from "@/schemas/crm";
import { requireAdmin, requireWriter } from "@/server/authz";

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createLead(formData: FormData) {
  const user = await requireWriter("No tienes permisos para registrar leads.");
  const data = leadSchema.parse(parseForm(formData));
  const contactedAt = nullableDate(data.lastContactAt) ?? new Date();

  const lead = await prisma.lead.create({
    data: {
      contactName: data.contactName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      medium: data.medium,
      status: data.status,
      notes: data.notes,
      lastContactAt: contactedAt,
      responsibleId: data.responsibleId,
      createdById: user.id,
      contactLogs: {
        create: {
          medium: data.medium,
          contactedAt,
          notes: data.notes,
          createdById: user.id,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "Lead",
      entityId: lead.id,
      actorId: user.id,
      after: { contactName: lead.contactName, companyName: lead.companyName },
    },
  });

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar leads.");
  const data = leadSchema.parse(parseForm(formData));
  const before = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new Error("El lead ya no esta disponible.");

  await prisma.lead.update({
    where: { id },
    data: {
      contactName: data.contactName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      medium: data.medium,
      status: data.status,
      notes: data.notes,
      lastContactAt: nullableDate(data.lastContactAt) ?? before.lastContactAt,
      responsibleId: data.responsibleId,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "Lead",
      entityId: id,
      actorId: user.id,
      after: { contactName: data.contactName, status: data.status },
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function addLeadContact(leadId: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para registrar contactos.");
  const data = leadContactLogSchema.parse(parseForm(formData));
  const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
  if (!lead) throw new Error("El lead ya no esta disponible.");
  const contactedAt = nullableDate(data.contactedAt) ?? new Date();

  await prisma.$transaction([
    prisma.leadContactLog.create({
      data: {
        leadId,
        medium: data.medium,
        contactedAt,
        notes: data.notes,
        createdById: user.id,
      },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: {
        medium: data.medium,
        lastContactAt:
          !lead.lastContactAt || contactedAt > lead.lastContactAt ? contactedAt : lead.lastContactAt,
        status:
          lead.status === LeadStatus.NUEVO ? LeadStatus.CONTACTADO : lead.status,
      },
    }),
  ]);

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}`);
}

export async function updateLeadStatus(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar leads.");
  const status = formData.get("status") as LeadStatus | null;
  if (!status) return;
  await prisma.lead.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "Lead",
      entityId: id,
      actorId: user.id,
      after: { status },
    },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function convertLeadToOpportunity(leadId: string) {
  const user = await requireWriter("No tienes permisos para convertir leads.");
  const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
  if (!lead) throw new Error("El lead ya no esta disponible.");
  if (lead.convertedOpportunityId) {
    redirect(`/opportunities/${lead.convertedOpportunityId}`);
  }

  let companyId: string | null = null;
  if (lead.companyName) {
    const normalizedName = normalizeName(lead.companyName);
    const existing = await prisma.company.findFirst({
      where: { deletedAt: null, normalizedName },
    });
    companyId =
      existing?.id ??
      (await prisma.company.create({ data: { name: lead.companyName, normalizedName } })).id;
  }

  const contact = await prisma.contact.create({
    data: {
      name: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      companyId,
    },
  });

  const opportunity = await prisma.opportunity.create({
    data: {
      name: lead.companyName ? `${lead.companyName} - ${lead.contactName}` : lead.contactName,
      companyId,
      primaryContactId: contact.id,
      responsibleId: lead.responsibleId,
      status: OpportunityStatus.EXPLORATION,
    },
  });

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CONVERTIDO,
        convertedOpportunityId: opportunity.id,
        convertedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "Lead",
        entityId: leadId,
        actorId: user.id,
        after: { status: "CONVERTIDO", opportunityId: opportunity.id },
      },
    }),
  ]);

  revalidatePath("/leads");
  revalidatePath("/opportunities");
  redirect(`/opportunities/${opportunity.id}`);
}

export async function deleteLead(id: string) {
  const user = await requireAdmin("Solo ADMIN puede eliminar leads.");
  await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.SOFT_DELETE,
      entityType: "Lead",
      entityId: id,
      actorId: user.id,
    },
  });
  revalidatePath("/leads");
  redirect("/leads");
}
