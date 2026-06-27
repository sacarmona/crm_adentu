import { timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  externalId: z.string().trim().max(200).optional(),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(80).optional(),
  companyName: z.string().trim().max(200).optional(),
  roleArea: z.string().trim().max(160).optional(),
  subject: z.string().trim().max(240).optional(),
  message: z.string().trim().min(3).max(10000),
  sourcePage: z.string().trim().url().max(2000).optional(),
  campaignSource: z.string().trim().max(160).optional(),
  campaignMedium: z.string().trim().max(160).optional(),
  campaignName: z.string().trim().max(160).optional(),
  consent: z.union([z.boolean(), z.string()]).optional(),
});

function pick(input: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (input[key] !== undefined && input[key] !== "") return input[key];
}

function normalize(input: Record<string, unknown>) {
  return {
    externalId: pick(input, "externalId", "external_id", "submission_id"),
    name: pick(input, "name", "nombre", "your-name"),
    email: pick(input, "email", "correo", "your-email"),
    phone: pick(input, "phone", "telefono", "tel", "your-phone"),
    companyName: pick(input, "companyName", "company", "empresa"),
    roleArea: pick(input, "roleArea", "cargo", "area"),
    subject: pick(input, "subject", "asunto", "your-subject"),
    message: pick(input, "message", "mensaje", "consulta", "your-message"),
    sourcePage: pick(input, "sourcePage", "source_page", "page_url"),
    campaignSource: pick(input, "campaignSource", "utm_source"),
    campaignMedium: pick(input, "campaignMedium", "utm_medium"),
    campaignName: pick(input, "campaignName", "utm_campaign"),
    consent: pick(input, "consent", "acepta_privacidad"),
  };
}

function isAuthorized(request: NextRequest) {
  if (!env.WEB_LEAD_SECRET) return false;
  const supplied = request.headers.get("x-web-lead-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(supplied && supplied.length === env.WEB_LEAD_SECRET.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(env.WEB_LEAD_SECRET)));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let input: Record<string, unknown>;
  try {
    input = (request.headers.get("content-type") ?? "").includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const parsed = schema.safeParse(normalize(input));
  if (!parsed.success) return NextResponse.json({ error: "validation_error", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  const data = parsed.data;
  const consent = data.consent === true || ["1", "true", "yes", "si", "on"].includes(String(data.consent).toLowerCase());
  const rawPayload = JSON.parse(JSON.stringify(input)) as Prisma.InputJsonObject;
  const lead = data.externalId
    ? await prisma.webLead.upsert({ where: { externalId: data.externalId }, create: { ...data, consent, rawPayload }, update: {} })
    : await prisma.webLead.create({ data: { ...data, consent, rawPayload } });
  return NextResponse.json({ id: lead.id, status: lead.status }, { status: 201 });
}
