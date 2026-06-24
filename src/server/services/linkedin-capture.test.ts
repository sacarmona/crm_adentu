import { describe, expect, it } from "vitest";

import { linkedInCaptureSchema } from "../../schemas/crm";
import { linkedinInteractionContent } from "./linkedin-capture";

describe("LinkedIn assisted capture", () => {
  it("accepts LinkedIn URLs and requires a CRM association", () => {
    expect(
      linkedInCaptureSchema.parse({
        date: "2026-06-24T12:00",
        sourceUrl: "https://www.linkedin.com/in/example/",
        personName: "Persona",
        organizationName: "Empresa",
        content: "Conversacion comercial sobre un nuevo proyecto.",
        companyId: "company-1",
        contactId: "",
        opportunityId: "",
        serviceId: "",
        nextAction: "",
        nextActionDate: "",
      }).sourceUrl,
    ).toContain("linkedin.com");
  });

  it("rejects non-LinkedIn URLs", () => {
    expect(() =>
      linkedInCaptureSchema.parse({
        date: "2026-06-24T12:00",
        sourceUrl: "https://example.com/profile",
        content: "Conversacion comercial sobre un nuevo proyecto.",
        companyId: "company-1",
      }),
    ).toThrow();
  });

  it("builds a traceable interaction body", () => {
    expect(
      linkedinInteractionContent({
        sourceUrl: "https://linkedin.com/in/example",
        personName: "Persona",
        content: "Solicita una reunion.",
      }),
    ).toContain("Fuente: https://linkedin.com/in/example");
  });
});
