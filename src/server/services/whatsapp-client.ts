import { env } from "@/lib/env";

export function isWhatsAppConfigured() {
  return Boolean(
    env.WHATSAPP_ACCESS_TOKEN &&
      env.WHATSAPP_PHONE_NUMBER_ID &&
      env.WHATSAPP_VERIFY_TOKEN,
  );
}

function normalizedNumber(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export async function sendWhatsAppTextMessage(input: {
  to: string;
  body: string;
}) {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp no esta configurado.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedNumber(input.to),
        type: "text",
        text: { body: input.body },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp rechazo el envio (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    messages?: { id: string }[];
  };
  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    throw new Error("WhatsApp no devolvio un id de mensaje.");
  }

  return { waMessageId: messageId };
}
