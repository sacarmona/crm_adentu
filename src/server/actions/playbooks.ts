"use server";

import { AuditAction, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { playbookItemSchema, playbookSchema } from "@/schemas/crm";

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function requireWriter() {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.COMERCIAL)
  ) {
    throw new Error("No tienes permisos para modificar playbooks.");
  }
  return session.user;
}

export async function createPlaybook(formData: FormData) {
  const user = await requireWriter();
  const data = playbookSchema.parse(parseForm(formData));
  const playbook = await prisma.playbook.create({
    data: { ...data, createdById: user.id },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "Playbook",
      entityId: playbook.id,
      actorId: user.id,
      after: { name: playbook.name, serviceId: playbook.serviceId },
    },
  });
  revalidatePath("/playbooks");
  redirect(`/playbooks/${playbook.id}`);
}

export async function updatePlaybook(id: string, formData: FormData) {
  const user = await requireWriter();
  const data = playbookSchema.parse(parseForm(formData));
  const before = await prisma.playbook.findFirst({
    where: { id, deletedAt: null },
  });
  if (!before) throw new Error("El playbook ya no esta disponible.");
  const playbook = await prisma.playbook.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "Playbook",
      entityId: id,
      actorId: user.id,
      before: { name: before.name, isActive: before.isActive },
      after: { name: playbook.name, isActive: playbook.isActive },
    },
  });
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${id}`);
  redirect(`/playbooks/${id}`);
}

export async function deletePlaybook(id: string) {
  const user = await requireWriter();
  await prisma.$transaction([
    prisma.playbook.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "Playbook",
        entityId: id,
        actorId: user.id,
      },
    }),
  ]);
  revalidatePath("/playbooks");
  redirect("/playbooks");
}

export async function createPlaybookItem(
  playbookId: string,
  formData: FormData,
) {
  const user = await requireWriter();
  const data = playbookItemSchema.parse(parseForm(formData));
  const item = await prisma.playbookItem.create({
    data: { ...data, playbookId },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "PlaybookItem",
      entityId: item.id,
      actorId: user.id,
      after: { playbookId, type: item.type, title: item.title },
    },
  });
  revalidatePath(`/playbooks/${playbookId}`);
  redirect(`/playbooks/${playbookId}`);
}

export async function updatePlaybookItem(id: string, formData: FormData) {
  const user = await requireWriter();
  const data = playbookItemSchema.parse(parseForm(formData));
  const before = await prisma.playbookItem.findFirst({
    where: { id, deletedAt: null },
  });
  if (!before) throw new Error("El elemento ya no esta disponible.");
  const item = await prisma.playbookItem.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "PlaybookItem",
      entityId: id,
      actorId: user.id,
      before: { type: before.type, title: before.title },
      after: { type: item.type, title: item.title },
    },
  });
  revalidatePath(`/playbooks/${item.playbookId}`);
  redirect(`/playbooks/${item.playbookId}`);
}

export async function deletePlaybookItem(id: string) {
  const user = await requireWriter();
  const item = await prisma.playbookItem.findFirst({
    where: { id, deletedAt: null },
  });
  if (!item) throw new Error("El elemento ya no esta disponible.");
  await prisma.$transaction([
    prisma.playbookItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "PlaybookItem",
        entityId: id,
        actorId: user.id,
      },
    }),
  ]);
  revalidatePath(`/playbooks/${item.playbookId}`);
}
