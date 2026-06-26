"use server";

import { AiProvider, AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  dictionaryValueSchema,
  serviceSchema,
} from "@/schemas/crm";
import { slugifyService } from "@/server/services/settings";
import { setActiveAiProvider } from "@/server/services/ai-provider";
import { requireAdmin } from "@/server/authz";

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function uniqueServiceSlug(name: string, excludeId?: string) {
  const base = slugifyService(name) || "servicio";
  let slug = base;
  let suffix = 2;

  while (
    await prisma.service.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function createService(formData: FormData) {
  const user = await requireAdmin("Solo ADMIN puede modificar la configuracion.");
  const data = serviceSchema.parse(parseForm(formData));
  const service = await prisma.service.create({
    data: { ...data, slug: await uniqueServiceSlug(data.name) },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "Service",
      entityId: service.id,
      actorId: user.id,
      after: { name: service.name, isActive: service.isActive },
    },
  });
  revalidatePath("/settings");
  redirect("/settings?view=services");
}

export async function updateService(id: string, formData: FormData) {
  const user = await requireAdmin("Solo ADMIN puede modificar la configuracion.");
  const data = serviceSchema.parse(parseForm(formData));
  const before = await prisma.service.findUnique({ where: { id } });
  if (!before) throw new Error("El servicio ya no esta disponible.");

  const service = await prisma.service.update({
    where: { id },
    data: { ...data, slug: await uniqueServiceSlug(data.name, id) },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "Service",
      entityId: id,
      actorId: user.id,
      before: { name: before.name, isActive: before.isActive },
      after: { name: service.name, isActive: service.isActive },
    },
  });
  revalidatePath("/settings");
  redirect("/settings?view=services");
}

export async function toggleService(id: string) {
  const user = await requireAdmin("Solo ADMIN puede modificar la configuracion.");
  const before = await prisma.service.findUnique({ where: { id } });
  if (!before) throw new Error("El servicio ya no esta disponible.");
  await prisma.$transaction([
    prisma.service.update({
      where: { id },
      data: { isActive: !before.isActive },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "Service",
        entityId: id,
        actorId: user.id,
        before: { isActive: before.isActive },
        after: { isActive: !before.isActive },
      },
    }),
  ]);
  revalidatePath("/settings");
}

export async function createDictionaryValue(formData: FormData) {
  const user = await requireAdmin("Solo ADMIN puede modificar la configuracion.");
  const data = dictionaryValueSchema.parse(parseForm(formData));
  const value = await prisma.dictionaryValue.create({ data });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "DictionaryValue",
      entityId: value.id,
      actorId: user.id,
      after: { type: value.type, key: value.key, label: value.label },
    },
  });
  revalidatePath("/settings");
  redirect(`/settings?view=dictionaries&type=${value.type}`);
}

export async function updateDictionaryValue(id: string, formData: FormData) {
  const user = await requireAdmin("Solo ADMIN puede modificar la configuracion.");
  const data = dictionaryValueSchema.parse(parseForm(formData));
  const before = await prisma.dictionaryValue.findUnique({ where: { id } });
  if (!before) throw new Error("El valor ya no esta disponible.");

  const value = await prisma.dictionaryValue.update({
    where: { id },
    data: {
      label: data.label,
      description: data.description,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "DictionaryValue",
      entityId: id,
      actorId: user.id,
      before: { label: before.label, isActive: before.isActive },
      after: { label: value.label, isActive: value.isActive },
    },
  });
  revalidatePath("/settings");
  redirect(`/settings?view=dictionaries&type=${value.type}`);
}

export async function toggleDictionaryValue(id: string) {
  const user = await requireAdmin("Solo ADMIN puede modificar la configuracion.");
  const before = await prisma.dictionaryValue.findUnique({ where: { id } });
  if (!before) throw new Error("El valor ya no esta disponible.");
  await prisma.$transaction([
    prisma.dictionaryValue.update({
      where: { id },
      data: { isActive: !before.isActive },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "DictionaryValue",
        entityId: id,
        actorId: user.id,
        before: { isActive: before.isActive },
        after: { isActive: !before.isActive },
      },
    }),
  ]);
  revalidatePath("/settings");
}

export async function updateAiProvider(formData: FormData) {
  const user = await requireAdmin("Solo ADMIN puede cambiar el proveedor de IA.");
  const provider = formData.get("provider");
  if (provider !== AiProvider.OPENAI && provider !== AiProvider.ANTHROPIC) {
    throw new Error("Proveedor de IA invalido.");
  }

  await setActiveAiProvider(provider, user.id);
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "AiSettings",
      entityId: "default",
      actorId: user.id,
      after: { activeProvider: provider },
    },
  });
  revalidatePath("/settings");
}

export async function updateWhatsAppMediaUploader(formData: FormData) {
  const user = await requireAdmin("Solo ADMIN puede cambiar el usuario de Drive para WhatsApp.");
  const mediaUploaderUserId = (formData.get("mediaUploaderUserId") as string | null) || null;

  await prisma.whatsAppSettings.upsert({
    where: { id: "default" },
    update: { mediaUploaderUserId, updatedById: user.id },
    create: { id: "default", mediaUploaderUserId, updatedById: user.id },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "WhatsAppSettings",
      entityId: "default",
      actorId: user.id,
      after: { mediaUploaderUserId },
    },
  });
  revalidatePath("/settings");
  redirect("/settings?view=calendar&saved=whatsapp");
}
