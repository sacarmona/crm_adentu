import { describe, expect, it } from "vitest";

import {
  buildEmailAnalysisPrompt,
  emailCommercialAnalysisSchema,
  parsedSuggestedDueDate,
} from "./email-analysis";

describe("email commercial analysis", () => {
  it("validates structured classifications", () => {
    expect(
      emailCommercialAnalysisSchema.parse({
        isCommercial: true,
        confidence: 0.9,
        summary: "Cliente solicita coordinar una visita tecnica.",
        intent: "FOLLOW_UP",
        sentiment: "POSITIVE",
        suggestedNextAction: "Proponer horarios para la visita.",
        suggestedDueDate: null,
      }).intent,
    ).toBe("FOLLOW_UP");
  });

  it("builds a prompt with CRM matches and no invention guidance", () => {
    const prompt = buildEmailAnalysisPrompt({
      direction: "INBOUND",
      fromAddress: "cliente@empresa.cl",
      toAddresses: ["comercial@adentu.cl"],
      subject: "Visita",
      snippet: "Necesitamos coordinar.",
      sentAt: new Date("2026-06-24T12:00:00.000Z"),
      matchedContactName: "Cliente Uno",
      matchedCompanyName: "Empresa Uno",
    });

    expect(prompt).toContain("Cliente Uno");
    expect(prompt).toContain("No inventes");
  });

  it("parses only valid suggested dates", () => {
    expect(parsedSuggestedDueDate("2026-06-30T12:00:00.000Z")).toBeInstanceOf(
      Date,
    );
    expect(parsedSuggestedDueDate("invalid")).toBeNull();
  });
});
