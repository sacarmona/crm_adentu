"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeName, nullableDate } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import {
  companySchema,
  contactSchema,
  opportunitySchema,
  opportunityStageSchema,
} from "@/schemas/crm";
import {
  calculateCompanyCompleteness,
  calculateContactCompleteness,
  calculateOpportunityCompleteness,
} from "@/server/services/completeness-scoring";
import { calculateOpportunityAmounts } from "@/server/services/opportunity-calculations";
import { requireWriter } from "@/server/authz";

async function writeAudit(input: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  actorId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
      ...(input.before == null ? {} : { before: input.before }),
      ...(input.after == null ? {} : { after: input.after }),
    },
  });
}

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createCompany(formData: FormData) {
  const user = await requireWriter();
  const data = companySchema.parse(parseForm(formData));
  const company = await prisma.company.create({
    data: {
      ...data,
      normalizedName: normalizeName(data.name),
      responsibleId: data.responsibleId,
      completeness: calculateCompanyCompleteness(data),
    },
  });

  await writeAudit({
    action: "CREATE",
    entityType: "Company",
    entityId: company.id,
    actorId: user.id,
    after: { name: company.name },
  });

  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(id: string, formData: FormData) {
  const user = await requireWriter();
  const data = companySchema.parse(parseForm(formData));
  const before = await prisma.company.findUnique({ where: { id } });
  const company = await prisma.company.update({
    where: { id },
    data: {
      ...data,
      normalizedName: normalizeName(data.name),
      responsibleId: data.responsibleId,
      completeness: calculateCompanyCompleteness(data),
    },
  });

  await writeAudit({
    action: "UPDATE",
    entityType: "Company",
    entityId: company.id,
    actorId: user.id,
    before: before ? { name: before.name, status: before.status } : undefined,
    after: { name: company.name, status: company.status },
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(id: string) {
  const user = await requireWriter();
  await prisma.company.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAudit({ action: "SOFT_DELETE", entityType: "Company", entityId: id, actorId: user.id });
  revalidatePath("/companies");
  redirect("/companies");
}

export async function createContact(formData: FormData) {
  const user = await requireWriter();
  const data = contactSchema.parse(parseForm(formData));
  const contact = await prisma.contact.create({
    data: {
      ...data,
      completeness: calculateContactCompleteness(data),
    },
  });

  await writeAudit({
    action: "CREATE",
    entityType: "Contact",
    entityId: contact.id,
    actorId: user.id,
    after: { name: contact.name },
  });

  revalidatePath("/contacts");
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(id: string, formData: FormData) {
  const user = await requireWriter();
  const data = contactSchema.parse(parseForm(formData));
  const before = await prisma.contact.findUnique({ where: { id } });
  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...data,
      completeness: calculateContactCompleteness(data),
    },
  });

  await writeAudit({
    action: "UPDATE",
    entityType: "Contact",
    entityId: contact.id,
    actorId: user.id,
    before: before ? { name: before.name, status: before.status } : undefined,
    after: { name: contact.name, status: contact.status },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(id: string) {
  const user = await requireWriter();
  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAudit({ action: "SOFT_DELETE", entityType: "Contact", entityId: id, actorId: user.id });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function createOpportunity(formData: FormData) {
  const user = await requireWriter();
  const data = opportunitySchema.parse(parseForm(formData));
  const amounts = calculateOpportunityAmounts(data);
  const opportunity = await prisma.opportunity.create({
    data: {
      ...data,
      estimatedCloseDate: nullableDate(data.estimatedCloseDate),
      estimatedStartDate: nullableDate(data.estimatedStartDate),
      nextActionDate: nullableDate(data.nextActionDate),
      priceClp: amounts.priceClp,
      monthlyAmount: amounts.monthlyAmount,
      totalAmount: amounts.totalAmount,
      weightedAmount: amounts.weightedAmount,
      completeness: calculateOpportunityCompleteness(data),
    },
  });

  await writeAudit({
    action: "CREATE",
    entityType: "Opportunity",
    entityId: opportunity.id,
    actorId: user.id,
    after: { name: opportunity.name, status: opportunity.status },
  });

  revalidatePath("/opportunities");
  redirect(`/opportunities/${opportunity.id}`);
}

export async function updateOpportunity(id: string, formData: FormData) {
  const user = await requireWriter();
  const data = opportunitySchema.parse(parseForm(formData));
  const amounts = calculateOpportunityAmounts(data);
  const before = await prisma.opportunity.findUnique({ where: { id } });
  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      ...data,
      estimatedCloseDate: nullableDate(data.estimatedCloseDate),
      estimatedStartDate: nullableDate(data.estimatedStartDate),
      nextActionDate: nullableDate(data.nextActionDate),
      priceClp: amounts.priceClp,
      monthlyAmount: amounts.monthlyAmount,
      totalAmount: amounts.totalAmount,
      weightedAmount: amounts.weightedAmount,
      completeness: calculateOpportunityCompleteness(data),
    },
  });

  await writeAudit({
    action: before?.status !== opportunity.status ? "STAGE_CHANGE" : "UPDATE",
    entityType: "Opportunity",
    entityId: opportunity.id,
    actorId: user.id,
    before: before ? { name: before.name, status: before.status } : undefined,
    after: { name: opportunity.name, status: opportunity.status },
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}`);
}

export async function deleteOpportunity(id: string) {
  const user = await requireWriter();
  await prisma.opportunity.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAudit({
    action: "SOFT_DELETE",
    entityType: "Opportunity",
    entityId: id,
    actorId: user.id,
  });
  revalidatePath("/opportunities");
  redirect("/opportunities");
}

export async function changeOpportunityStage(input: {
  opportunityId: string;
  status: string;
}) {
  const user = await requireWriter(
    "No tienes permisos para modificar el pipeline.",
  );

  const data = opportunityStageSchema.parse(input);
  const before = await prisma.opportunity.findFirst({
    where: { id: data.opportunityId, deletedAt: null },
    select: { id: true, name: true, status: true },
  });

  if (!before) {
    throw new Error("La oportunidad ya no esta disponible.");
  }

  if (before.status === data.status) {
    return { status: before.status };
  }

  await prisma.$transaction([
    prisma.opportunity.update({
      where: { id: before.id },
      data: { status: data.status },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.STAGE_CHANGE,
        entityType: "Opportunity",
        entityId: before.id,
        actorId: user.id,
        before: { name: before.name, status: before.status },
        after: { name: before.name, status: data.status },
        metadata: { source: "pipeline" },
      },
    }),
  ]);

  revalidatePath("/pipeline");
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${before.id}`);

  return { status: data.status };
}
