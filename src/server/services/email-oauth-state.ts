import { createHmac, timingSafeEqual } from "node:crypto";

import { EmailProvider } from "@prisma/client";

import { env } from "../../lib/env";

type OAuthState = {
  userId: string;
  provider: EmailProvider;
  expiresAt: number;
};

function signingSecret() {
  const secret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET es obligatorio para iniciar OAuth.");
  }
  return secret;
}

export function createEmailOAuthState(input: Omit<OAuthState, "expiresAt">) {
  const payload = Buffer.from(
    JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyEmailOAuthState(value: string): OAuthState {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    throw new Error("Estado OAuth invalido.");
  }

  const expected = createHmac("sha256", signingSecret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("Firma OAuth invalida.");
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
  if (parsed.expiresAt < Date.now()) {
    throw new Error("La autorizacion OAuth expiro.");
  }
  if (!Object.values(EmailProvider).includes(parsed.provider)) {
    throw new Error("Proveedor OAuth invalido.");
  }

  return parsed;
}
