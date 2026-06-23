"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { normalizeName, nullableDate } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import {
  companySchema,
  contactSchema,
  opportunitySchema,
} from "@/schemas/crm";
import { calculateOpportunityAmounts } from "@/server/services/opportunity-calculations";

async function getActorId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function writeAudit(input: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: await getActorId(),
      ...(input.before == null ? {} : { before: input.before }),
      ...(input.after == null ? {} : { after: input.after }),
    },
  });
}

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createCompany(formData: FormData) {
  const data = companySchema.parse(parseForm(formData));
  const company = await prisma.company.create({
    data: {
      ...data,
      normalizedName: normalizeName(data.name),
      responsibleId: data.responsibleId,
    },
  });

  await writeAudit({
    action: "CREATE",
    entityType: "Company",
    entityId: company.id,
    after: { name: company.name },
  });

  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(id: string, formData: FormData) {
  const data = companySchema.parse(parseForm(formData));
  const before = await prisma.company.findUnique({ where: { id } });
  const company = await prisma.company.update({
    where: { id },
    data: {
      ...data,
      normalizedName: normalizeName(data.name),
      responsibleId: data.responsibleId,
    },
  });

  await writeAudit({
    action: "UPDATE",
    entityType: "Company",
    entityId: company.id,
    before: before ? { name: before.name, status: before.status } : undefined,
    after: { name: company.name, status: company.status },
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(id: string) {
  await prisma.company.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAudit({ action: "SOFT_DELETE", entityType: "Company", entityId: id });
  revalidatePath("/companies");
  redirect("/companies");
}

export async function createContact(formData: FormData) {
  const data = contactSchema.parse(parseForm(formData));
  const contact = await prisma.contact.create({ data });

  await writeAudit({
    action: "CREATE",
    entityType: "Contact",
    entityId: contact.id,
    after: { name: contact.name },
  });

  revalidatePath("/contacts");
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(id: string, formData: FormData) {
  const data = contactSchema.parse(parseForm(formData));
  const before = await prisma.contact.findUnique({ where: { id } });
  const contact = await prisma.contact.update({ where: { id }, data });

  await writeAudit({
    action: "UPDATE",
    entityType: "Contact",
    entityId: contact.id,
    before: before ? { name: before.name, status: before.status } : undefined,
    after: { name: contact.name, status: contact.status },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(id: string) {
  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAudit({ action: "SOFT_DELETE", entityType: "Contact", entityId: id });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function createOpportunity(formData: FormData) {
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
    },
  });

  await writeAudit({
    action: "CREATE",
    entityType: "Opportunity",
    entityId: opportunity.id,
    after: { name: opportunity.name, status: opportunity.status },
  });

  revalidatePath("/opportunities");
  redirect(`/opportunities/${opportunity.id}`);
}

export async function updateOpportunity(id: string, formData: FormData) {
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
    },
  });

  await writeAudit({
    action: before?.status !== opportunity.status ? "STAGE_CHANGE" : "UPDATE",
    entityType: "Opportunity",
    entityId: opportunity.id,
    before: before ? { name: before.name, status: before.status } : undefined,
    after: { name: opportunity.name, status: opportunity.status },
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${id}`);
}

export async function deleteOpportunity(id: string) {
  await prisma.opportunity.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAudit({
    action: "SOFT_DELETE",
    entityType: "Opportunity",
    entityId: id,
  });
  revalidatePath("/opportunities");
  redirect("/opportunities");
}
