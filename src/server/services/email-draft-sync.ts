import { EmailProvider } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  createOrUpdateGmailDraft,
  hasGmailComposeScope,
  usableEmailAccessToken,
} from "@/server/services/email-providers";

export async function pushEmailDraftToMailbox(draftId: string) {
  const draft = await prisma.emailDraft.findUnique({
    where: { id: draftId },
    include: { emailMessage: { include: { connection: true } } },
  });
  if (!draft) return;

  const connection = draft.emailMessage.connection;

  if (connection.provider !== EmailProvider.GMAIL) {
    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        pushError: "Guardado automatico aun no disponible para Microsoft.",
      },
    });
    return;
  }

  if (!hasGmailComposeScope(connection.scope)) {
    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        pushError:
          "Reconecta tu cuenta de Gmail para guardar este borrador en tu buzon.",
      },
    });
    return;
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

    const result = await createOrUpdateGmailDraft({
      accessToken: token.accessToken,
      to: draft.emailMessage.fromAddress,
      subject: draft.subject,
      body: draft.body,
      threadId: draft.emailMessage.threadId ?? undefined,
      inReplyTo: draft.emailMessage.messageIdHeader ?? undefined,
      providerDraftId: draft.providerDraftId ?? undefined,
    });

    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        providerDraftId: result.id,
        pushedAt: new Date(),
        pushError: null,
      },
    });
  } catch (error) {
    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        pushError:
          error instanceof Error
            ? error.message
            : "No fue posible guardar el borrador en Gmail.",
      },
    });
  }
}
