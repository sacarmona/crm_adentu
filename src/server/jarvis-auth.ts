import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

function extractBearerToken(value: string | null) {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

function tokensMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function authorizeJarvisRequest(request: NextRequest) {
  if (!env.JARVIS_API_TOKEN) {
    return NextResponse.json(
      { error: "Jarvis API no configurada" },
      { status: 503 },
    );
  }

  const token =
    extractBearerToken(request.headers.get("authorization")) ??
    request.headers.get("x-jarvis-token");

  if (!token || !tokensMatch(token, env.JARVIS_API_TOKEN)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return null;
}
