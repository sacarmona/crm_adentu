import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { ingestWhatsAppWebhook } from "@/server/services/whatsapp-sync";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    env.WHATSAPP_VERIFY_TOKEN &&
    token === env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: "forbidden" }, { status: 403 });
}

function hasValidSignature(rawBody: string, signatureHeader: string | null) {
  if (!env.WHATSAPP_APP_SECRET) {
    // No secret configured: accept (development/local testing only).
    return true;
  }
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", env.WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ status: "invalid signature" }, { status: 403 });
  }

  try {
    const payload = JSON.parse(rawBody);
    await ingestWhatsAppWebhook(payload);
  } catch {
    // Always ack 200 to Meta so it doesn't retry-storm on our side errors;
    // failures are simply messages we'll never see, same risk as a missed webhook delivery.
  }

  return NextResponse.json({ status: "ok" });
}
