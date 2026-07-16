import { z } from "zod";

export const commercialAnalysisSchema = z.object({
  summary: z.string().min(1),
  customerInterests: z.array(z.string()),
  objections: z.array(z.string()),
  commitments: z.array(z.string()),
  risks: z.array(z.string()),
  suggestedNextSteps: z.array(z.string()),
  mentionedServices: z.array(z.string()),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  suggestedAdvanceProbability: z.number().min(0).max(1).nullable(),
  suggestedChanges: z.object({
    probability: z.number().min(0).max(1).nullable(),
    nextAction: z.string().nullable(),
    opportunityStatus: z
      .enum([
        "EXPLORATION",
        "PROPOSAL_SENT",
        "NEGOTIATION",
        "WON",
        "STALLED",
        "LOST",
      ])
      .nullable(),
  }),
});

export type CommercialAnalysis = z.infer<typeof commercialAnalysisSchema>;

export function buildInteractionAnalysisPrompt(input: {
  interactionType: string;
  interactionDate: Date;
  content: string;
  nextAction?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  opportunityName?: string | null;
  opportunityStatus?: string | null;
  opportunityProbability?: number | null;
  serviceName?: string | null;
}) {
  return [
    "Analiza esta interaccion comercial de ADENTU Ingenieria.",
    "Separa hechos observables de sugerencias. No inventes compromisos, fechas ni montos.",
    "Las sugerencias deben ser concretas y breves. Usa arreglos vacios cuando no exista evidencia.",
    `Tipo: ${input.interactionType}`,
    `Fecha: ${input.interactionDate.toISOString()}`,
    `Empresa: ${input.companyName ?? "Sin empresa"}`,
    `Contacto: ${input.contactName ?? "Sin contacto"}`,
    `Oportunidad: ${input.opportunityName ?? "Sin oportunidad"}`,
    `Etapa actual: ${input.opportunityStatus ?? "Sin etapa"}`,
    `Probabilidad actual: ${input.opportunityProbability ?? "Sin probabilidad"}`,
    `Servicio: ${input.serviceName ?? "Sin servicio"}`,
    `Proxima accion registrada: ${input.nextAction ?? "Ninguna"}`,
    `Contenido:\n${input.content}`,
  ].join("\n");
}

export function buildOpportunityAnalysisPrompt(input: {
  opportunityName: string;
  opportunityStatus: string;
  opportunityProbability?: number | null;
  companyName?: string | null;
  industry?: string | null;
  serviceName?: string | null;
  pendingTasks?: { title: string; dueDate?: Date | null }[];
  webContext?: string | null;
  interactions: {
    date: Date;
    type: string;
    content: string;
    nextAction?: string | null;
  }[];
}) {
  const history = input.interactions
    .map(
      (interaction, index) =>
        `(${index + 1}) ${interaction.date.toISOString()} - ${interaction.type}\n${interaction.content}` +
        (interaction.nextAction ? `\nProxima accion registrada: ${interaction.nextAction}` : ""),
    )
    .join("\n\n");

  const taskSection =
    input.pendingTasks && input.pendingTasks.length > 0
      ? [
          `Tareas pendientes (${input.pendingTasks.length}):`,
          ...input.pendingTasks.map(
            (t) =>
              `- ${t.title}${t.dueDate ? ` (vence ${t.dueDate.toISOString().slice(0, 10)})` : ""}`,
          ),
        ].join("\n")
      : null;

  const webSection = input.webContext
    ? `Contexto publico de la empresa (fuente web, usar solo como referencia):\n${input.webContext}`
    : null;

  return [
    "Analiza el historial completo de interacciones de esta oportunidad comercial de ADENTU Ingenieria.",
    "Evalua la evolucion en conjunto, no cada interaccion por separado.",
    "Separa hechos observables de sugerencias. No inventes compromisos, fechas ni montos.",
    "Las sugerencias deben ser concretas y breves. Usa arreglos vacios cuando no exista evidencia.",
    "Si el historial muestra estancamiento (sin avances reales entre interacciones), indicalo en el resumen y sugiere marcar como STALLED si corresponde.",
    webSection ? "El contexto web es informacion publica de referencia; no lo presentes como hecho verificado." : null,
    `Oportunidad: ${input.opportunityName}`,
    `Empresa: ${input.companyName ?? "Sin empresa"}`,
    input.industry ? `Industria: ${input.industry}` : null,
    `Etapa actual: ${input.opportunityStatus}`,
    `Probabilidad actual: ${input.opportunityProbability ?? "Sin probabilidad"}`,
    `Servicio: ${input.serviceName ?? "Sin servicio"}`,
    taskSection,
    webSection,
    `Historial de interacciones (${input.interactions.length}):`,
    history,
  ]
    .filter(Boolean)
    .join("\n");
}

export function clampProbability(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}
