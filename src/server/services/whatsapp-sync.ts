import { WhatsAppDirection } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type WhatsAppWebhookMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string };
  document?: { id?: string; filename?: string; caption?: string };
  audio?: { id?: string };
  video?: { id?: string; caption?: string };
  sticker?: { id?: string };
  location?: { latitude?: number; longitude?: number; name?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string } }>;
        messages?: WhatsAppWebhookMessage[];
      };
    }>;
  }>;
};

function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export async function matchContactByPhone(rawNumber: string) {
  const digits = digitsOnly(rawNumber);
  if (digits.length < 6) return null;
  const suffix = digits.slice(-8);

  const contacts = await prisma.contact.findMany({
    where: { deletedAt: null, phone: { not: null } },
    select: { id: true, phone: true, companyId: true },
  });

  const match = contacts.find(
    (contact) => contact.phone && digitsOnly(contact.phone).endsWith(suffix),
  );

  return match ?? null;
}

function extractMessageContent(message: WhatsAppWebhookMessage) {
  switch (message.type) {
    case "text":
      return { body: message.text?.body ?? null, mediaType: null, mediaId: null };
    case "image":
      return {
        body: message.image?.caption ?? "[Imagen]",
        mediaType: "image",
        mediaId: message.image?.id ?? null,
      };
    case "document":
      return {
        body: message.document?.caption ?? message.document?.filename ?? "[Documento]",
        mediaType: "document",
        mediaId: message.document?.id ?? null,
      };
    case "audio":
      return { body: "[Audio]", mediaType: "audio", mediaId: message.audio?.id ?? null };
    case "video":
      return {
        body: message.video?.caption ?? "[Video]",
        mediaType: "video",
        mediaId: message.video?.id ?? null,
      };
    case "sticker":
      return { body: "[Sticker]", mediaType: "sticker", mediaId: message.sticker?.id ?? null };
    case "location":
      return {
        body: message.location?.name ?? "[Ubicacion compartida]",
        mediaType: "location",
        mediaId: null,
      };
    case "button":
      return { body: message.button?.text ?? "[Boton]", mediaType: "button", mediaId: null };
    case "interactive":
      return {
        body:
          message.interactive?.button_reply?.title ??
          message.interactive?.list_reply?.title ??
          "[Respuesta interactiva]",
        mediaType: "interactive",
        mediaId: null,
      };
    default:
      return { body: null, mediaType: message.type, mediaId: null };
  }
}

export async function ingestWhatsAppWebhook(payload: WhatsAppWebhookPayload) {
  let processed = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const messages = value?.messages ?? [];
      if (messages.length === 0) continue;

      const businessNumber = value?.metadata?.display_phone_number ?? "";
      const contactName = value?.contacts?.[0]?.profile?.name ?? null;

      for (const message of messages) {
        const existing = await prisma.whatsAppMessage.findUnique({
          where: { waMessageId: message.id },
          select: { id: true },
        });
        if (existing) continue;

        const { body, mediaType, mediaId } = extractMessageContent(message);
        const match = await matchContactByPhone(message.from);

        await prisma.whatsAppMessage.create({
          data: {
            waMessageId: message.id,
            direction: WhatsAppDirection.INBOUND,
            fromNumber: message.from,
            toNumber: businessNumber,
            contactName,
            body,
            mediaType,
            mediaId,
            timestamp: new Date(Number(message.timestamp) * 1000),
            matchedContactId: match?.id ?? null,
            matchedCompanyId: match?.companyId ?? null,
          },
        });
        processed += 1;
      }
    }
  }

  return { processed };
}
