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

/**
 * Autoriza las llamadas de la app "ADENTU Proyectos" a la API de exportacion.
 * Devuelve una respuesta de error si no esta autorizada, o null si todo esta bien.
 */
export function authorizeProjectsRequest(request: NextRequest) {
  if (!env.PROJECTS_API_TOKEN) {
    return NextResponse.json(
      { error: "API de proyectos no configurada" },
      { status: 503 },
    );
  }

  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token || !tokensMatch(token, env.PROJECTS_API_TOKEN)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return null;
}
