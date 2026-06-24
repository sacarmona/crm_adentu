import { describe, expect, it } from "vitest";

import {
  buildEmailDraftPrompt,
  emailDraftFormSchema,
  emailDraftSchema,
} from "./email-draft";

describe("email draft suggestions", () => {
  it("validates a concise response", () => {
    expect(
      emailDraftSchema.parse({
        subject: "Re: Reunion tecnica",
        body: "Gracias por el mensaje. Podemos coordinar una reunion para revisar el alcance.",
      }).subject,
    ).toBe("Re: Reunion tecnica");
  });

  it("requires a draft id when reviewing", () => {
    expect(() =>
      emailDraftFormSchema.parse({
        subject: "Re: Reunion",
        body: "Gracias por el mensaje. Coordinemos una reunion.",
      }),
    ).toThrow();
  });

  it("instructs the model not to invent commitments", () => {
    expect(
      buildEmailDraftPrompt({
        senderAddress: "cliente@empresa.cl",
        classificationSummary: "Solicita una reunion.",
        intent: "FOLLOW_UP",
      }),
    ).toContain("No inventes");
  });
});
