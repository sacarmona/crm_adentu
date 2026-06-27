import Anthropic from "@anthropic-ai/sdk";

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

const ANALYSIS_TOOL_NAME = "submit_commercial_analysis";
const EMAIL_ANALYSIS_TOOL_NAME = "submit_email_classification";
const EMAIL_DRAFT_TOOL_NAME = "submit_email_draft";
const LINKEDIN_PROFILE_TOOL_NAME = "submit_linkedin_profile_extraction";

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

const emailAnalysisToolSchema = {
  name: EMAIL_ANALYSIS_TOOL_NAME,
  description: "Registra la clasificacion comercial estructurada del correo.",
  input_schema: {
    type: "object" as const,
    properties: {
      isCommercial: { type: "boolean" as const },
      confidence: { type: "number" as const, minimum: 0, maximum: 1 },
      summary: { type: "string" as const },
      intent: {
        type: "string" as const,
        enum: [
          "INQUIRY",
          "OPPORTUNITY",
          "FOLLOW_UP",
          "PROPOSAL",
          "NEGOTIATION",
          "SUPPORT",
          "ADMINISTRATIVE",
          "OTHER",
        ],
      },
      sentiment: {
        type: "string" as const,
        enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
      },
      suggestedNextAction: {
        type: ["string", "null"] as unknown as "string",
      },
      suggestedDueDate: {
        type: ["string", "null"] as unknown as "string",
      },
    },
    required: [
      "isCommercial",
      "confidence",
      "summary",
      "intent",
      "sentiment",
      "suggestedNextAction",
      "suggestedDueDate",
    ],
  },
};

const emailDraftToolSchema = {
  name: EMAIL_DRAFT_TOOL_NAME,
  description: "Registra un borrador editable de respuesta comercial.",
  input_schema: {
    type: "object" as const,
    properties: {
      subject: { type: "string" as const },
      body: { type: "string" as const },
    },
    required: ["subject", "body"],
  },
};

const linkedInProfileToolSchema = {
  name: LINKEDIN_PROFILE_TOOL_NAME,
  description: "Registra los datos extraidos de un perfil de LinkedIn en PDF.",
  input_schema: {
    type: "object" as const,
    properties: {
      personName: { type: ["string", "null"] as unknown as "string" },
      organizationName: { type: ["string", "null"] as unknown as "string" },
      sourceUrl: { type: ["string", "null"] as unknown as "string" },
      content: { type: "string" as const },
    },
    required: ["personName", "organizationName", "sourceUrl", "content"],
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

export async function analyzeCommercialOpportunityWithAnthropic(
  input: Parameters<typeof buildOpportunityAnalysisPrompt>[0],
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
      { role: "user", content: buildOpportunityAnalysisPrompt(input) },
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

export async function analyzeCommercialEmailWithAnthropic(
  input: Parameters<typeof buildEmailAnalysisPrompt>[0],
): Promise<EmailCommercialAnalysis> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no esta configurada.");
  }

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 768,
    system:
      "Eres un clasificador prudente de correo comercial B2B. No inventes informacion ausente.",
    messages: [{ role: "user", content: buildEmailAnalysisPrompt(input) }],
    tools: [emailAnalysisToolSchema],
    tool_choice: { type: "tool", name: EMAIL_ANALYSIS_TOOL_NAME },
  });
  const toolUse = response.content.find(
    (block) =>
      block.type === "tool_use" && block.name === EMAIL_ANALYSIS_TOOL_NAME,
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("La clasificacion de correo no pudo validarse.");
  }
  const result = emailCommercialAnalysisSchema.safeParse(toolUse.input);
  if (!result.success) {
    throw new Error("La clasificacion de correo no pudo validarse.");
  }
  return result.data;
}

export async function extractLinkedInProfileWithAnthropic(
  profileText: string,
): Promise<LinkedInProfileExtraction> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no esta configurada.");
  }

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 768,
    system:
      "Extraes datos estructurados de perfiles de LinkedIn exportados en PDF. No inventes informacion ausente.",
    messages: [
      { role: "user", content: buildLinkedInProfileExtractionPrompt(profileText) },
    ],
    tools: [linkedInProfileToolSchema],
    tool_choice: { type: "tool", name: LINKEDIN_PROFILE_TOOL_NAME },
  });
  const toolUse = response.content.find(
    (block) =>
      block.type === "tool_use" && block.name === LINKEDIN_PROFILE_TOOL_NAME,
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("La extraccion del perfil no pudo validarse.");
  }
  const result = linkedInProfileExtractionSchema.safeParse(toolUse.input);
  if (!result.success) {
    throw new Error("La extraccion del perfil no pudo validarse.");
  }
  return result.data;
}

export async function generateCommercialEmailDraftWithAnthropic(
  input: Parameters<typeof buildEmailDraftPrompt>[0],
): Promise<EmailDraftSuggestion> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no esta configurada.");
  }
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1024,
    system:
      "Redactas borradores B2B prudentes. Nunca afirmes que el mensaje fue enviado.",
    messages: [{ role: "user", content: buildEmailDraftPrompt(input) }],
    tools: [emailDraftToolSchema],
    tool_choice: { type: "tool", name: EMAIL_DRAFT_TOOL_NAME },
  });
  const toolUse = response.content.find(
    (block) =>
      block.type === "tool_use" && block.name === EMAIL_DRAFT_TOOL_NAME,
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("El borrador de correo no pudo validarse.");
  }
  const result = emailDraftSchema.safeParse(toolUse.input);
  if (!result.success) {
    throw new Error("El borrador de correo no pudo validarse.");
  }
  return result.data;
}
