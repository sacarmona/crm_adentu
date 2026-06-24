import { z } from "zod";

export const emailDraftSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(10).max(5000),
});

export const emailDraftFormSchema = emailDraftSchema.extend({
  draftId: z.string().uuid(),
});

export type EmailDraftSuggestion = z.infer<typeof emailDraftSchema>;

export function buildEmailDraftPrompt(input: {
  originalSubject?: string | null;
  originalSnippet?: string | null;
  senderName?: string | null;
  senderAddress: string;
  classificationSummary: string;
  intent: string;
  suggestedNextAction?: string | null;
  contactName?: string | null;
  companyName?: string | null;
  opportunityName?: string | null;
}) {
  return [
    "Redacta un borrador de respuesta comercial para ADENTU Ingenieria.",
    "Debe ser breve, profesional, cordial y escrito en espanol.",
    "No inventes precios, fechas, capacidades, compromisos ni adjuntos.",
    "No agregues destinatarios, firmas, datos personales ni enlaces.",
    "Si falta informacion necesaria, formula una pregunta clara.",
    `Remitente: ${input.senderName ?? input.senderAddress}`,
    `Contacto CRM: ${input.contactName ?? "Sin contacto"}`,
    `Empresa CRM: ${input.companyName ?? "Sin empresa"}`,
    `Oportunidad CRM: ${input.opportunityName ?? "Sin oportunidad"}`,
    `Asunto original: ${input.originalSubject ?? "Sin asunto"}`,
    `Extracto original: ${input.originalSnippet ?? "Sin extracto"}`,
    `Resumen validado: ${input.classificationSummary}`,
    `Intencion: ${input.intent}`,
    `Siguiente accion sugerida: ${input.suggestedNextAction ?? "Ninguna"}`,
  ].join("\n");
}
