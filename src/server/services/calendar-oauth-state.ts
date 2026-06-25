import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../../lib/env";

type CalendarOAuthState = {
  userId: string;
  expiresAt: number;
};

function signingSecret() {
  const secret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET es obligatorio para iniciar OAuth.");
  }
  return secret;
}

export function createCalendarOAuthState(input: { userId: string }) {
  const payload = Buffer.from(
    JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyCalendarOAuthState(value: string): CalendarOAuthState {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    throw new Error("Estado OAuth invalido.");
  }

  const expected = createHmac("sha256", signingSecret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("Firma OAuth invalida.");
  }

  const parsed = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as CalendarOAuthState;
  if (parsed.expiresAt < Date.now()) {
    throw new Error("La autorizacion OAuth expiro.");
  }

  return parsed;
}
