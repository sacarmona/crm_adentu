"use server";

import {
  AuditAction,
  Currency,
  OpportunityStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { nullableDate } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import {
  commercialMilestoneSchema,
  marketAssetSchema,
  marketOpportunitySchema,
} from "@/schemas/crm";
import { calculateOpportunityCompleteness } from "@/server/services/completeness-scoring";
import { calculateOpportunityAmounts } from "@/server/services/opportunity-calculations";
import { requireWriter } from "@/server/authz";

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createMarketAsset(formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar el modulo de mercado.");
  const data = marketAssetSchema.parse(parseForm(formData));
  const asset = await prisma.marketAsset.create({ data });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "MarketAsset",
      entityId: asset.id,
      actorId: user.id,
      after: { unitName: asset.unitName, serviceId: asset.serviceId },
    },
  });

  revalidatePath("/market");
  redirect(`/market/assets/${asset.id}`);
}

export async function updateMarketAsset(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar el modulo de mercado.");
  const data = marketAssetSchema.parse(parseForm(formData));
  const before = await prisma.marketAsset.findFirst({
    where: { id, deletedAt: null },
  });

  if (!before) {
    throw new Error("El activo ya no esta disponible.");
  }

  const asset = await prisma.marketAsset.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "MarketAsset",
      entityId: id,
      actorId: user.id,
      before: { unitName: before.unitName, serviceId: before.serviceId },
      after: { unitName: asset.unitName, serviceId: asset.serviceId },
    },
  });

  revalidatePath("/market");
  revalidatePath(`/market/assets/${id}`);
  redirect(`/market/assets/${id}`);
}

export async function deleteMarketAsset(id: string) {
  const user = await requireWriter("No tienes permisos para modificar el modulo de mercado.");
  await prisma.$transaction([
    prisma.marketAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "MarketAsset",
        entityId: id,
        actorId: user.id,
      },
    }),
  ]);
  revalidatePath("/market");
  redirect("/market");
}

export async function createCommercialMilestone(formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar el modulo de mercado.");
  const data = commercialMilestoneSchema.parse(parseForm(formData));
  const milestone = await prisma.commercialMilestone.create({
    data: {
      ...data,
      date: nullableDate(data.date) ?? new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "CommercialMilestone",
      entityId: milestone.id,
      actorId: user.id,
      after: { project: milestone.project, date: milestone.date.toISOString() },
    },
  });
  revalidatePath("/market");
  redirect("/market?view=milestones");
}

export async function deleteCommercialMilestone(id: string) {
  const user = await requireWriter("No tienes permisos para modificar el modulo de mercado.");
  await prisma.$transaction([
    prisma.commercialMilestone.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "CommercialMilestone",
        entityId: id,
        actorId: user.id,
      },
    }),
  ]);
  revalidatePath("/market");
}

export async function createOpportunityFromMarket(formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar el modulo de mercado.");
  const data = marketOpportunitySchema.parse(parseForm(formData));
  const asset = await prisma.marketAsset.findFirst({
    where: { id: data.assetId, deletedAt: null },
  });

  if (!asset) {
    throw new Error("La senal de mercado ya no esta disponible.");
  }

  const amounts = calculateOpportunityAmounts(data);
  const completenessInput = {
    name: data.name,
    companyId: data.companyId,
    primaryContactId: null,
    serviceId: data.serviceId,
    status: OpportunityStatus.EXPLORATION,
    certainty: null,
    probability: data.probability,
    businessUnit: null,
    price: data.price,
    estimatedCloseDate: data.estimatedCloseDate,
    nextActionDate: null,
  };
  const opportunity = await prisma.$transaction(async (tx) => {
    const created = await tx.opportunity.create({
      data: {
        name: data.name,
        companyId: data.companyId,
        serviceId: data.serviceId,
        status: OpportunityStatus.EXPLORATION,
        probability: data.probability,
        currency: Currency.CLP,
        price: data.price,
        exchangeRate: data.exchangeRate,
        priceClp: amounts.priceClp,
        quantity: data.quantity,
        monthlyAmount: amounts.monthlyAmount,
        months: data.months,
        totalAmount: amounts.totalAmount,
        weightedAmount: amounts.weightedAmount,
        estimatedCloseDate: nullableDate(data.estimatedCloseDate),
        responsibleId: data.responsibleId,
        notes: data.notes,
        completeness: calculateOpportunityCompleteness(completenessInput),
      },
    });
    await tx.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: "Opportunity",
        entityId: created.id,
        actorId: user.id,
        after: { name: created.name, status: created.status },
        metadata: { source: "market", marketAssetId: asset.id },
      },
    });
    return created;
  });

  revalidatePath("/market");
  revalidatePath("/opportunities");
  revalidatePath("/pipeline");
  redirect(`/opportunities/${opportunity.id}`);
}
