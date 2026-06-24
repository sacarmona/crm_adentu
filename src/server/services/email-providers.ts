import { EmailDirection, EmailProvider } from "@prisma/client";

import { env } from "@/lib/env";
import { decryptEmailToken, encryptEmailToken } from "@/server/services/email-crypto";

export type NormalizedEmailMessage = {
  providerMessageId: string;
  threadId?: string;
  direction: EmailDirection;
  fromAddress: string;
  fromName?: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject?: string;
  snippet?: string;
  sentAt: Date;
  isRead: boolean;
};

type ProviderConfig = {
  clientId?: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
};

export function emailProviderConfig(provider: EmailProvider): ProviderConfig {
  if (provider === EmailProvider.GMAIL) {
    return {
      clientId: env.GMAIL_CLIENT_ID,
      clientSecret: env.GMAIL_CLIENT_SECRET,
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "openid",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
    };
  }

  const tenant = env.MICROSOFT_TENANT_ID;
  return {
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
    authorizationUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    scopes: ["openid", "email", "offline_access", "User.Read", "Mail.Read"],
  };
}

export function isEmailProviderConfigured(provider: EmailProvider) {
  const config = emailProviderConfig(provider);
  return Boolean(config.clientId && config.clientSecret);
}

export function emailOAuthAuthorizationUrl(input: {
  provider: EmailProvider;
  redirectUri: string;
  state: string;
}) {
  const config = emailProviderConfig(input.provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error("El proveedor de correo no esta configurado.");
  }

  const url = new URL(config.authorizationUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", input.state);

  if (input.provider === EmailProvider.GMAIL) {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  } else {
    url.searchParams.set("response_mode", "query");
  }

  return url;
}

export async function exchangeEmailAuthorizationCode(input: {
  provider: EmailProvider;
  code: string;
  redirectUri: string;
}) {
  const config = emailProviderConfig(input.provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error("El proveedor de correo no esta configurado.");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OAuth rechazo el codigo (${response.status}).`);
  }

  const token = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!token.access_token) {
    throw new Error("OAuth no devolvio un token de acceso.");
  }

  return {
    accessTokenEncrypted: encryptEmailToken(token.access_token),
    refreshTokenEncrypted: token.refresh_token
      ? encryptEmailToken(token.refresh_token)
      : undefined,
    tokenExpiresAt: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : undefined,
    scope: token.scope,
    accessToken: token.access_token,
  };
}

export async function emailAddressForToken(
  provider: EmailProvider,
  accessToken: string,
) {
  const url =
    provider === EmailProvider.GMAIL
      ? "https://gmail.googleapis.com/gmail/v1/users/me/profile"
      : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No fue posible identificar el buzon (${response.status}).`);
  }

  const profile = (await response.json()) as {
    emailAddress?: string;
    mail?: string;
    userPrincipalName?: string;
  };
  const address =
    profile.emailAddress ?? profile.mail ?? profile.userPrincipalName;

  if (!address) {
    throw new Error("El proveedor no devolvio la direccion del buzon.");
  }

  return address.toLowerCase();
}

async function refreshAccessToken(input: {
  provider: EmailProvider;
  refreshTokenEncrypted: string;
}) {
  const config = emailProviderConfig(input.provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error("El proveedor de correo no esta configurado.");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: decryptEmailToken(input.refreshTokenEncrypted),
      grant_type: "refresh_token",
      ...(input.provider === EmailProvider.MICROSOFT
        ? { scope: config.scopes.join(" ") }
        : {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No fue posible renovar el acceso (${response.status}).`);
  }

  const token = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!token.access_token) {
    throw new Error("El proveedor no devolvio un token renovado.");
  }

  return {
    accessToken: token.access_token,
    accessTokenEncrypted: encryptEmailToken(token.access_token),
    refreshTokenEncrypted: token.refresh_token
      ? encryptEmailToken(token.refresh_token)
      : input.refreshTokenEncrypted,
    tokenExpiresAt: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : undefined,
    scope: token.scope,
  };
}

export async function usableEmailAccessToken(connection: {
  provider: EmailProvider;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
}) {
  const stillValid =
    !connection.tokenExpiresAt ||
    connection.tokenExpiresAt.getTime() > Date.now() + 60_000;

  if (stillValid) {
    return {
      accessToken: decryptEmailToken(connection.accessTokenEncrypted),
      refreshed: null,
    };
  }

  if (!connection.refreshTokenEncrypted) {
    throw new Error("La autorizacion expiro. Vuelve a conectar el buzon.");
  }

  const refreshed = await refreshAccessToken({
    provider: connection.provider,
    refreshTokenEncrypted: connection.refreshTokenEncrypted,
  });
  return { accessToken: refreshed.accessToken, refreshed };
}

function parseAddress(value?: string | null) {
  if (!value) return { name: undefined, address: "" };
  const match = value.match(/^(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
  return {
    name: match?.[1]?.trim() || undefined,
    address: (match?.[2] ?? value).trim().toLowerCase(),
  };
}

function splitAddresses(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => parseAddress(item).address)
    .filter(Boolean);
}

async function gmailMessages(accessToken: string, mailbox: string) {
  const listResponse = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=newer_than%3A90d",
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  if (!listResponse.ok) {
    throw new Error(`Gmail no pudo listar mensajes (${listResponse.status}).`);
  }
  const list = (await listResponse.json()) as { messages?: { id: string }[] };

  return Promise.all(
    (list.messages ?? []).map(async ({ id }) => {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(`Gmail no pudo leer un mensaje (${response.status}).`);
      }
      const message = (await response.json()) as {
        id: string;
        threadId?: string;
        snippet?: string;
        internalDate?: string;
        labelIds?: string[];
        payload?: { headers?: { name: string; value: string }[] };
      };
      const headers = new Map(
        (message.payload?.headers ?? []).map((header) => [
          header.name.toLowerCase(),
          header.value,
        ]),
      );
      const from = parseAddress(headers.get("from"));
      const sentAtValue = headers.get("date");
      return {
        providerMessageId: message.id,
        threadId: message.threadId,
        direction:
          from.address === mailbox.toLowerCase()
            ? EmailDirection.OUTBOUND
            : EmailDirection.INBOUND,
        fromAddress: from.address,
        fromName: from.name,
        toAddresses: splitAddresses(headers.get("to")),
        ccAddresses: splitAddresses(headers.get("cc")),
        subject: headers.get("subject"),
        snippet: message.snippet,
        sentAt: sentAtValue
          ? new Date(sentAtValue)
          : new Date(Number(message.internalDate ?? Date.now())),
        isRead: !(message.labelIds ?? []).includes("UNREAD"),
      } satisfies NormalizedEmailMessage;
    }),
  );
}

async function microsoftMessages(accessToken: string, mailbox: string) {
  const url = new URL("https://graph.microsoft.com/v1.0/me/messages");
  url.searchParams.set("$top", "50");
  url.searchParams.set(
    "$select",
    "id,conversationId,from,toRecipients,ccRecipients,subject,bodyPreview,receivedDateTime,sentDateTime,isRead",
  );
  url.searchParams.set("$orderby", "receivedDateTime desc");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Microsoft no pudo listar mensajes (${response.status}).`);
  }
  const data = (await response.json()) as {
    value: Array<{
      id: string;
      conversationId?: string;
      from?: { emailAddress?: { address?: string; name?: string } };
      toRecipients?: Array<{ emailAddress?: { address?: string } }>;
      ccRecipients?: Array<{ emailAddress?: { address?: string } }>;
      subject?: string;
      bodyPreview?: string;
      receivedDateTime?: string;
      sentDateTime?: string;
      isRead?: boolean;
    }>;
  };

  return data.value.map((message) => {
    const address = message.from?.emailAddress?.address?.toLowerCase() ?? "";
    return {
      providerMessageId: message.id,
      threadId: message.conversationId,
      direction:
        address === mailbox.toLowerCase()
          ? EmailDirection.OUTBOUND
          : EmailDirection.INBOUND,
      fromAddress: address,
      fromName: message.from?.emailAddress?.name,
      toAddresses: (message.toRecipients ?? [])
        .map((recipient) => recipient.emailAddress?.address?.toLowerCase())
        .filter((value): value is string => Boolean(value)),
      ccAddresses: (message.ccRecipients ?? [])
        .map((recipient) => recipient.emailAddress?.address?.toLowerCase())
        .filter((value): value is string => Boolean(value)),
      subject: message.subject,
      snippet: message.bodyPreview,
      sentAt: new Date(
        message.receivedDateTime ?? message.sentDateTime ?? Date.now(),
      ),
      isRead: Boolean(message.isRead),
    } satisfies NormalizedEmailMessage;
  });
}

export function fetchProviderMessages(input: {
  provider: EmailProvider;
  accessToken: string;
  mailbox: string;
}) {
  return input.provider === EmailProvider.GMAIL
    ? gmailMessages(input.accessToken, input.mailbox)
    : microsoftMessages(input.accessToken, input.mailbox);
}
