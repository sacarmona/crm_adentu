import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { env } from "@/lib/env";
import {
  CommercialAnalysis,
  buildInteractionAnalysisPrompt,
  buildOpportunityAnalysisPrompt,
  commercialAnalysisSchema,
} from "@/server/services/ai-analysis";
import {
  buildEmailAnalysisPrompt,
  EmailCommercialAnalysis,
  emailCommercialAnalysisSchema,
} from "@/server/services/email-analysis";
import {
  buildEmailDraftPrompt,
  EmailDraftSuggestion,
  emailDraftSchema,
} from "@/server/services/email-draft";
import {
  buildLinkedInProfileExtractionPrompt,
  LinkedInProfileExtraction,
  linkedInProfileExtractionSchema,
} from "@/server/services/linkedin-profile";

export function isAiConfigured() {
  return Boolean(env.OPENAI_API_KEY);
}

export async function generateCommercialEmailDraft(
  input: Parameters<typeof buildEmailDraftPrompt>[0],
): Promise<EmailDraftSuggestion> {
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
          "Redactas borradores B2B prudentes. Nunca afirmes que el mensaje fue enviado.",
      },
      { role: "user", content: buildEmailDraftPrompt(input) },
    ],
    text: {
      format: zodTextFormat(emailDraftSchema, "commercial_email_draft"),
    },
  });
  if (!response.output_parsed) {
    throw new Error("El borrador de correo no pudo validarse.");
  }
  return response.output_parsed;
}

export async function analyzeCommercialEmail(
  input: Parameters<typeof buildEmailAnalysisPrompt>[0],
): Promise<EmailCommercialAnalysis> {
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
          "Eres un clasificador prudente de correo comercial B2B. No inventes informacion ausente.",
      },
      { role: "user", content: buildEmailAnalysisPrompt(input) },
    ],
    text: {
      format: zodTextFormat(
        emailCommercialAnalysisSchema,
        "commercial_email_analysis",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("La clasificacion de correo no pudo validarse.");
  }

  return response.output_parsed;
}

export async function extractLinkedInProfile(
  profileText: string,
): Promise<LinkedInProfileExtraction> {
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
          "Extraes datos estructurados de perfiles de LinkedIn exportados en PDF. No inventes informacion ausente.",
      },
      {
        role: "user",
        content: buildLinkedInProfileExtractionPrompt(profileText),
      },
    ],
    text: {
      format: zodTextFormat(
        linkedInProfileExtractionSchema,
        "linkedin_profile_extraction",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("La extraccion del perfil no pudo validarse.");
  }

  return response.output_parsed;
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

export async function analyzeCommercialOpportunity(
  input: Parameters<typeof buildOpportunityAnalysisPrompt>[0],
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
      { role: "user", content: buildOpportunityAnalysisPrompt(input) },
    ],
    text: {
      format: zodTextFormat(
        commercialAnalysisSchema,
        "commercial_opportunity_analysis",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("La respuesta de IA no pudo validarse.");
  }

  return response.output_parsed;
}
