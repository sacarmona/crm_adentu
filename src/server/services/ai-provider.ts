import { AiProvider } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  analyzeCommercialEmailWithAnthropic,
  analyzeCommercialInteractionWithAnthropic,
  extractLinkedInProfileWithAnthropic,
  generateCommercialEmailDraftWithAnthropic,
  isAnthropicConfigured,
} from "@/server/services/anthropic";
import {
  buildInteractionAnalysisPrompt,
  CommercialAnalysis,
} from "@/server/services/ai-analysis";
import {
  buildEmailAnalysisPrompt,
  EmailCommercialAnalysis,
} from "@/server/services/email-analysis";
import {
  buildEmailDraftPrompt,
  EmailDraftSuggestion,
} from "@/server/services/email-draft";
import {
  analyzeCommercialEmail,
  analyzeCommercialInteraction,
  extractLinkedInProfile,
  generateCommercialEmailDraft,
  isAiConfigured,
} from "@/server/services/openai";
import { LinkedInProfileExtraction } from "@/server/services/linkedin-profile";

const SETTINGS_ID = "default";

export async function getActiveAiProvider(): Promise<AiProvider> {
  const settings = await prisma.aiSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  return settings?.activeProvider ?? AiProvider.OPENAI;
}

export async function generateEmailDraftWithActiveProvider(
  input: Parameters<typeof buildEmailDraftPrompt>[0],
): Promise<EmailDraftSuggestion> {
  const provider = await getActiveAiProvider();
  return provider === AiProvider.ANTHROPIC
    ? generateCommercialEmailDraftWithAnthropic(input)
    : generateCommercialEmailDraft(input);
}

export async function analyzeEmailWithActiveProvider(
  input: Parameters<typeof buildEmailAnalysisPrompt>[0],
): Promise<EmailCommercialAnalysis> {
  const provider = await getActiveAiProvider();
  return provider === AiProvider.ANTHROPIC
    ? analyzeCommercialEmailWithAnthropic(input)
    : analyzeCommercialEmail(input);
}

export async function setActiveAiProvider(
  provider: AiProvider,
  updatedById: string,
) {
  return prisma.aiSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { activeProvider: provider, updatedById },
    create: { id: SETTINGS_ID, activeProvider: provider, updatedById },
  });
}

export async function isActiveProviderConfigured() {
  const provider = await getActiveAiProvider();
  return provider === AiProvider.ANTHROPIC
    ? isAnthropicConfigured()
    : isAiConfigured();
}

export async function extractLinkedInProfileWithActiveProvider(
  profileText: string,
): Promise<LinkedInProfileExtraction> {
  const provider = await getActiveAiProvider();
  return provider === AiProvider.ANTHROPIC
    ? extractLinkedInProfileWithAnthropic(profileText)
    : extractLinkedInProfile(profileText);
}

export async function analyzeInteractionWithActiveProvider(
  input: Parameters<typeof buildInteractionAnalysisPrompt>[0],
): Promise<CommercialAnalysis> {
  const provider = await getActiveAiProvider();
  return provider === AiProvider.ANTHROPIC
    ? analyzeCommercialInteractionWithAnthropic(input)
    : analyzeCommercialInteraction(input);
}
