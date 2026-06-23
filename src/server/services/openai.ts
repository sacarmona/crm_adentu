import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { env } from "@/lib/env";
import {
  CommercialAnalysis,
  buildInteractionAnalysisPrompt,
  commercialAnalysisSchema,
} from "@/server/services/ai-analysis";

export function isAiConfigured() {
  return Boolean(env.OPENAI_API_KEY);
}

export async function analyzeCommercialInteraction(
  input: Parameters<typeof buildInteractionAnalysisPrompt>[0],
): Promise<CommercialAnalysis> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no esta configurada.");
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await openai.responses.parse({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content:
          "Eres un analista comercial B2B para una empresa chilena de ingenieria. Responde solo con evidencia del texto y sugerencias prudentes.",
      },
      { role: "user", content: buildInteractionAnalysisPrompt(input) },
    ],
    text: {
      format: zodTextFormat(
        commercialAnalysisSchema,
        "commercial_interaction_analysis",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("La respuesta de IA no pudo validarse.");
  }

  return response.output_parsed;
}
