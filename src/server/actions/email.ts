"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/server/authz";
import { synchronizeEmailConnection } from "@/server/services/email-sync";

export async function syncEmailConnection(connectionId: string) {
  const user = await requireWriter("No tienes permisos para sincronizar correo.");
  await synchronizeEmailConnection(connectionId, user.id);
  revalidatePath("/email");
}

export async function disconnectEmailConnection(connectionId: string) {
  const user = await requireWriter("No tienes permisos para desconectar correo.");
  const connection = await prisma.emailConnection.findFirst({
    where: { id: connectionId, userId: user.id },
  });
  if (!connection) {
    throw new Error("La conexion de correo no existe.");
  }

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "EmailConnection",
        entityId: connection.id,
        actorId: user.id,
        before: {
          provider: connection.provider,
          emailAddress: connection.emailAddress,
        },
      },
    }),
    prisma.emailConnection.delete({ where: { id: connection.id } }),
  ]);
  revalidatePath("/email");
}
