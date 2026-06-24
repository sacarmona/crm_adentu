import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";
import {
  CommercialAnalysis,
  buildInteractionAnalysisPrompt,
  commercialAnalysisSchema,
} from "@/server/services/ai-analysis";

const ANALYSIS_TOOL_NAME = "submit_commercial_analysis";

const analysisToolSchema = {
  name: ANALYSIS_TOOL_NAME,
  description: "Registra el analisis comercial estructurado de la interaccion.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string" as const },
      customerInterests: { type: "array" as const, items: { type: "string" as const } },
      objections: { type: "array" as const, items: { type: "string" as const } },
      commitments: { type: "array" as const, items: { type: "string" as const } },
      risks: { type: "array" as const, items: { type: "string" as const } },
      suggestedNextSteps: { type: "array" as const, items: { type: "string" as const } },
      mentionedServices: { type: "array" as const, items: { type: "string" as const } },
      sentiment: {
        type: "string" as const,
        enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
      },
      suggestedAdvanceProbability: {
        type: ["number", "null"] as unknown as "number",
      },
      suggestedChanges: {
        type: "object" as const,
        properties: {
          probability: { type: ["number", "null"] as unknown as "number" },
          nextAction: { type: ["string", "null"] as unknown as "string" },
          opportunityStatus: {
            type: ["string", "null"] as unknown as "string",
            enum: [
              "EXPLORATION",
              "PROPOSAL_SENT",
              "NEGOTIATION",
              "WON",
              "STALLED",
              "LOST",
              null,
            ],
          },
        },
        required: ["probability", "nextAction", "opportunityStatus"],
      },
    },
    required: [
      "summary",
      "customerInterests",
      "objections",
      "commitments",
      "risks",
      "suggestedNextSteps",
      "mentionedServices",
      "sentiment",
      "suggestedAdvanceProbability",
      "suggestedChanges",
    ],
  },
};

export function isAnthropicConfigured() {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export async function analyzeCommercialInteractionWithAnthropic(
  input: Parameters<typeof buildInteractionAnalysisPrompt>[0],
): Promise<CommercialAnalysis> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no esta configurada.");
  }

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1024,
    system:
      "Eres un analista comercial B2B para una empresa chilena de ingenieria. Responde solo con evidencia del texto y sugerencias prudentes.",
    messages: [
      { role: "user", content: buildInteractionAnalysisPrompt(input) },
    ],
    tools: [analysisToolSchema],
    tool_choice: { type: "tool", name: ANALYSIS_TOOL_NAME },
  });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === ANALYSIS_TOOL_NAME,
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("La respuesta de IA no pudo validarse.");
  }

  const result = commercialAnalysisSchema.safeParse(toolUse.input);
  if (!result.success) {
    throw new Error("La respuesta de IA no pudo validarse.");
  }

  return result.data;
}
