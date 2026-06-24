import { prisma } from "@/lib/prisma";
import {
  fetchProviderMessages,
  usableEmailAccessToken,
} from "@/server/services/email-providers";
import { emailSyncErrorMessage } from "@/server/services/email-sync-error";

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

    const inserted = await prisma.emailMessage.createMany({
      data: messages.map((message) => ({
        ...message,
        connectionId: connection.id,
        toAddresses: message.toAddresses,
        ccAddresses: message.ccAddresses,
      })),
      skipDuplicates: true,
    });
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), lastError: null },
    });

    return inserted.count;
  } catch (error) {
    const message = emailSyncErrorMessage(error);
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: { lastError: message },
    });
    throw new Error(message);
  }
}
