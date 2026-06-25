import { z } from "zod";

export const emailCommercialAnalysisSchema = z.object({
  isCommercial: z.boolean(),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(800),
  intent: z.enum([
    "INQUIRY",
    "OPPORTUNITY",
    "FOLLOW_UP",
    "PROPOSAL",
    "NEGOTIATION",
    "SUPPORT",
    "ADMINISTRATIVE",
    "OTHER",
  ]),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  suggestedNextAction: z.string().max(300).nullable(),
  suggestedDueDate: z.string().datetime().nullable(),
});

export type EmailCommercialAnalysis = z.infer<
  typeof emailCommercialAnalysisSchema
>;

export function buildEmailAnalysisPrompt(input: {
  direction: string;
  fromAddress: string;
  toAddresses: string[];
  subject?: string | null;
  snippet?: string | null;
  sentAt: Date;
  matchedContactName?: string | null;
  matchedCompanyName?: string | null;
  matchedOpportunityName?: string | null;
  channel?: "email" | "whatsapp";
}) {
  const channel = input.channel ?? "email";
  const lines = [
    channel === "whatsapp"
      ? "Clasifica esta conversacion de WhatsApp para el CRM comercial de ADENTU Ingenieria."
      : "Clasifica este correo para el CRM comercial de ADENTU Ingenieria.",
    "Considera comercial solo lo relacionado con clientes, prospectos, proyectos, propuestas, negociaciones, reuniones o seguimiento de oportunidades.",
    "No inventes hechos, compromisos ni fechas. Si no existe una fecha explicita o claramente inferible, suggestedDueDate debe ser null.",
    channel === "whatsapp"
      ? "El resumen debe ser breve y basado exclusivamente en los mensajes de la conversacion."
      : "El resumen debe ser breve y basado exclusivamente en asunto y contenido del correo.",
    `Direccion: ${input.direction}`,
    `Fecha: ${input.sentAt.toISOString()}`,
    `Desde: ${input.fromAddress}`,
    `Para: ${input.toAddresses.join(", ") || "Sin destinatarios"}`,
    `Contacto CRM coincidente: ${input.matchedContactName ?? "Ninguno"}`,
    `Empresa CRM coincidente: ${input.matchedCompanyName ?? "Ninguna"}`,
    `Oportunidad CRM coincidente: ${input.matchedOpportunityName ?? "Ninguna"}`,
  ];
  if (channel !== "whatsapp") {
    lines.push(`Asunto: ${input.subject ?? "Sin asunto"}`);
  }
  lines.push(
    channel === "whatsapp"
      ? `Conversacion:\n${input.snippet ?? "Sin contenido"}`
      : `Contenido del correo: ${input.snippet ?? "Sin contenido"}`,
  );
  return lines.join("\n");
}

export function parsedSuggestedDueDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
