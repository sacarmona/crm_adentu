"use server";

import { AuditAction, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  createUserSchema,
  resetUserPasswordSchema,
  updateUserPhoneSchema,
  updateUserRoleSchema,
} from "@/schemas/auth";
import { requireAdmin } from "@/server/authz";

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createUserAccount(formData: FormData) {
  const actor = await requireAdmin("Solo ADMIN puede crear usuarios.");
  const data = createUserSchema.parse(parseForm(formData));

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("Ya existe un usuario con ese correo.");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone,
      passwordHash,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "User",
      entityId: user.id,
      actorId: actor.id,
      after: { name: user.name, email: user.email, role: user.role },
    },
  });
  revalidatePath("/settings");
  redirect("/settings?view=users");
}

export async function updateUserRole(id: string, formData: FormData) {
  const actor = await requireAdmin("Solo ADMIN puede cambiar roles.");
  const data = updateUserRoleSchema.parse(parseForm(formData));

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new Error("El usuario ya no esta disponible.");
  if (id === actor.id && data.role !== UserRole.ADMIN) {
    throw new Error("No puedes quitarte el rol ADMIN a ti mismo.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { role: data.role } }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: id,
        actorId: actor.id,
        before: { role: before.role },
        after: { role: data.role },
      },
    }),
  ]);
  revalidatePath("/settings");
}

export async function updateUserPhone(id: string, formData: FormData) {
  const actor = await requireAdmin("Solo ADMIN puede modificar el telefono de un usuario.");
  const data = updateUserPhoneSchema.parse(parseForm(formData));

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new Error("El usuario ya no esta disponible.");

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { phone: data.phone ?? null } }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: id,
        actorId: actor.id,
        before: { phone: before.phone },
        after: { phone: data.phone ?? null },
      },
    }),
  ]);
  revalidatePath("/settings");
}

export async function toggleUserActive(id: string) {
  const actor = await requireAdmin("Solo ADMIN puede activar o desactivar usuarios.");
  if (id === actor.id) {
    throw new Error("No puedes desactivar tu propia cuenta.");
  }

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new Error("El usuario ya no esta disponible.");
  const nextDeletedAt = before.deletedAt ? null : new Date();

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deletedAt: nextDeletedAt } }),
    prisma.auditLog.create({
      data: {
        action: before.deletedAt
          ? AuditAction.UPDATE
          : AuditAction.SOFT_DELETE,
        entityType: "User",
        entityId: id,
        actorId: actor.id,
        before: { active: !before.deletedAt },
        after: { active: !nextDeletedAt },
      },
    }),
  ]);
  revalidatePath("/settings");
}

export async function resetUserPassword(id: string, formData: FormData) {
  const actor = await requireAdmin("Solo ADMIN puede restablecer contrasenas.");
  const data = resetUserPasswordSchema.parse(parseForm(formData));

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new Error("El usuario ya no esta disponible.");

  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash } }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: id,
        actorId: actor.id,
        after: { passwordReset: true },
      },
    }),
  ]);
  revalidatePath("/settings");
}
