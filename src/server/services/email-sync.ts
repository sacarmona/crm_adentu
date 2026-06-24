import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  fetchProviderMessages,
  usableEmailAccessToken,
} from "@/server/services/email-providers";

export async function synchronizeEmailConnection(connectionId: string, userId: string) {
  const connection = await prisma.emailConnection.findFirst({
    where: { id: connectionId, userId },
  });
  if (!connection) {
    throw new Error("La conexion de correo no existe.");
  }

  try {
    const token = await usableEmailAccessToken(connection);
    if (token.refreshed) {
      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: {
          accessTokenEncrypted: token.refreshed.accessTokenEncrypted,
          refreshTokenEncrypted: token.refreshed.refreshTokenEncrypted,
          tokenExpiresAt: token.refreshed.tokenExpiresAt,
          scope: token.refreshed.scope ?? connection.scope,
        },
      });
    }

    const messages = await fetchProviderMessages({
      provider: connection.provider,
      accessToken: token.accessToken,
      mailbox: connection.emailAddress,
    });

    await prisma.$transaction(async (tx) => {
      for (const message of messages) {
        await tx.emailMessage.upsert({
          where: {
            connectionId_providerMessageId: {
              connectionId: connection.id,
              providerMessageId: message.providerMessageId,
            },
          },
          create: {
            ...message,
            connectionId: connection.id,
            toAddresses: message.toAddresses,
            ccAddresses: message.ccAddresses,
          },
          update: {
            ...message,
            toAddresses: message.toAddresses,
            ccAddresses: message.ccAddresses,
          },
        });
      }
      await tx.emailConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date(), lastError: null },
      });
    });

    return messages.length;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Fallo desconocido de sincronizacion.";
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: { lastError: message.slice(0, 500) },
    });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new Error("No fue posible guardar los mensajes sincronizados.");
    }
    throw error;
  }
}
