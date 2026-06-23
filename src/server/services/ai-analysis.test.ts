import { describe, expect, it } from "vitest";

import {
  buildInteractionAnalysisPrompt,
  clampProbability,
  commercialAnalysisSchema,
} from "./ai-analysis";

describe("AI commercial analysis", () => {
  it("validates the structured insight contract", () => {
    expect(
      commercialAnalysisSchema.parse({
        summary: "Cliente solicita propuesta.",
        customerInterests: ["Termografia"],
        objections: [],
        commitments: ["Enviar propuesta"],
        risks: [],
        suggestedNextSteps: ["Preparar propuesta"],
        mentionedServices: ["Termografia"],
        sentiment: "POSITIVE",
        suggestedAdvanceProbability: 0.65,
        suggestedChanges: {
          probability: 0.65,
          nextAction: "Enviar propuesta",
          opportunityStatus: "PROPOSAL_SENT",
        },
      }),
    ).toBeTruthy();
  });

  it("builds a prompt with CRM context and an anti-hallucination rule", () => {
    const prompt = buildInteractionAnalysisPrompt({
      interactionType: "ONLINE_MEETING",
      interactionDate: new Date("2026-06-23T12:00:00Z"),
      content: "Cliente solicita propuesta.",
      companyName: "Empresa Demo",
    });

    expect(prompt).toContain("No inventes");
    expect(prompt).toContain("Empresa Demo");
    expect(prompt).toContain("Cliente solicita propuesta.");
  });

  it("clamps suggested probabilities", () => {
    expect(clampProbability(1.4)).toBe(1);
    expect(clampProbability(-0.2)).toBe(0);
    expect(clampProbability(null)).toBeNull();
  });
});
