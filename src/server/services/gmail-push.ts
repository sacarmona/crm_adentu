import { EmailProvider } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { applyDiscardRulesForUser } from "@/server/services/email-discard-rules";
import {
  fetchGmailMessagesByIds,
  GmailHistoryExpiredError,
  listGmailHistoryMessageIds,
  usableEmailAccessToken,
  watchGmailMailbox,
} from "@/server/services/email-providers";
import { synchronizeEmailConnection } from "@/server/services/email-sync";

type PubSubPushBody = {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
};

type GmailPushNotification = {
  emailAddress?: string;
  historyId?: string;
};

function decodePubSubData(data?: string) {
  if (!data) {
    throw new Error("Pub/Sub no incluyo datos en la notificacion.");
  }
  return JSON.parse(Buffer.from(data, "base64").toString("utf-8")) as GmailPushNotification;
}

export function isAuthorizedGmailPushRequest(input: {
  tokenFromQuery?: string | null;
  tokenFromHeader?: string | null;
}) {
  return Boolean(
    env.GMAIL_PUSH_TOKEN &&
      (input.tokenFromQuery === env.GMAIL_PUSH_TOKEN ||
        input.tokenFromHeader === env.GMAIL_PUSH_TOKEN),
  );
}

async function accessTokenForConnection(connection: {
  id: string;
  provider: EmailProvider;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
  scope: string | null;
}) {
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
  return token.accessToken;
}

async function insertMessagesForConnection(input: {
  connectionId: string;
  userId: string;
  messages: Awaited<ReturnType<typeof fetchGmailMessagesByIds>>;
}) {
  const tombstones = await prisma.emailMessageTombstone.findMany({
    where: { connectionId: input.connectionId },
    select: { providerMessageId: true },
  });
  const tombstonedIds = new Set(tombstones.map((tombstone) => tombstone.providerMessageId));
  const newMessages = input.messages.filter(
    (message) => !tombstonedIds.has(message.providerMessageId),
  );

  const inserted = await prisma.emailMessage.createMany({
    data: newMessages.map((message) => ({
      ...message,
      connectionId: input.connectionId,
      toAddresses: message.toAddresses,
      ccAddresses: message.ccAddresses,
      messageIdHeader: message.messageIdHeader ?? null,
    })),
    skipDuplicates: true,
  });
  await applyDiscardRulesForUser(input.userId);
  return inserted.count;
}

export async function synchronizeGmailConnectionFromHistory(input: {
  connectionId: string;
  userId: string;
  incomingHistoryId: string;
}) {
  const connection = await prisma.emailConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      provider: EmailProvider.GMAIL,
    },
  });
  if (!connection) {
    throw new Error("La conexion Gmail no existe.");
  }

  if (!connection.syncCursor) {
    const messages = await synchronizeEmailConnection(connection.id, connection.userId);
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: { syncCursor: input.incomingHistoryId },
    });
    return { mode: "full-sync" as const, messages };
  }

  try {
    const accessToken = await accessTokenForConnection(connection);
    const history = await listGmailHistoryMessageIds(accessToken, connection.syncCursor);
    const messages = history.messageIds.length
      ? await fetchGmailMessagesByIds(
          accessToken,
          connection.emailAddress,
          history.messageIds,
        )
      : [];
    const inserted = await insertMessagesForConnection({
      connectionId: connection.id,
      userId: connection.userId,
      messages,
    });
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        syncCursor: history.historyId ?? input.incomingHistoryId,
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
    return { mode: "history" as const, messages: inserted };
  } catch (error) {
    if (error instanceof GmailHistoryExpiredError) {
      const messages = await synchronizeEmailConnection(connection.id, connection.userId);
      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: { syncCursor: input.incomingHistoryId },
      });
      return { mode: "history-expired-full-sync" as const, messages };
    }
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        lastError: error instanceof Error ? error.message : "Error desconocido",
      },
    });
    throw error;
  }
}

export async function handleGmailPubSubPush(body: PubSubPushBody) {
  const notification = decodePubSubData(body.message?.data);
  if (!notification.emailAddress || !notification.historyId) {
    throw new Error("La notificacion Gmail no incluye emailAddress/historyId.");
  }

  const connections = await prisma.emailConnection.findMany({
    where: {
      provider: EmailProvider.GMAIL,
      emailAddress: { equals: notification.emailAddress, mode: "insensitive" },
    },
    select: { id: true, userId: true, emailAddress: true },
  });

  const results = [];
  for (const connection of connections) {
    try {
      const result = await synchronizeGmailConnectionFromHistory({
        connectionId: connection.id,
        userId: connection.userId,
        incomingHistoryId: notification.historyId,
      });
      results.push({ connectionId: connection.id, status: "synced" as const, ...result });
    } catch (error) {
      results.push({
        connectionId: connection.id,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  return {
    emailAddress: notification.emailAddress,
    historyId: notification.historyId,
    matchedConnections: connections.length,
    results,
  };
}

export async function renewGmailWatches() {
  if (!env.GMAIL_PUBSUB_TOPIC_NAME) {
    return { enabled: false as const, results: [] };
  }

  const connections = await prisma.emailConnection.findMany({
    where: { provider: EmailProvider.GMAIL },
    orderBy: { createdAt: "asc" },
  });
  const results = [];
  for (const connection of connections) {
    try {
      const accessToken = await accessTokenForConnection(connection);
      const watch = await watchGmailMailbox(accessToken, env.GMAIL_PUBSUB_TOPIC_NAME);
      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: {
          syncCursor: watch.historyId ?? connection.syncCursor,
          lastError: null,
        },
      });
      results.push({
        connectionId: connection.id,
        mailbox: connection.emailAddress,
        status: "watching" as const,
        expiration: watch.expiration,
      });
    } catch (error) {
      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: {
          lastError: error instanceof Error ? error.message : "Error desconocido",
        },
      });
      results.push({
        connectionId: connection.id,
        mailbox: connection.emailAddress,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
  return { enabled: true as const, results };
}
