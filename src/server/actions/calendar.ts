"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriter } from "@/server/authz";

export async function disconnectCalendarConnection() {
  const user = await requireWriter("No tienes permisos para desconectar el calendario.");
  const connection = await prisma.calendarConnection.findFirst({
    where: { userId: user.id },
  });
  if (!connection) {
    throw new Error("La conexion de calendario no existe.");
  }

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        action: AuditAction.SOFT_DELETE,
        entityType: "CalendarConnection",
        entityId: connection.id,
        actorId: user.id,
        before: { emailAddress: connection.emailAddress },
      },
    }),
    prisma.calendarConnection.delete({ where: { id: connection.id } }),
  ]);

  revalidatePath("/settings");
}
