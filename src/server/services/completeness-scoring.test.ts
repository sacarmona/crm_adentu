import { describe, expect, it } from "vitest";

import {
  calculateCompanyCompleteness,
  calculateContactCompleteness,
  calculateOpportunityCompleteness,
} from "./completeness-scoring";

describe("completeness scoring", () => {
  it("scores a complete company at 100", () => {
    expect(
      calculateCompanyCompleteness({
        name: "ADENTU",
        industry: "Energia",
        region: "Metropolitana",
        status: "ACTIVE_CLIENT",
        size: "Mediana",
        responsibleId: "user-1",
        notes: "Cuenta prioritaria",
      }),
    ).toBe(100);
  });

  it("does not count blank optional fields", () => {
    expect(
      calculateCompanyCompleteness({
        name: "Empresa",
        status: "PROSPECTING",
        industry: "   ",
      }),
    ).toBe(30);
  });

  it("weights company and contact association in contact scoring", () => {
    expect(
      calculateContactCompleteness({
        name: "Ana",
        companyId: "company-1",
        roleArea: "Operaciones",
        status: "QUALIFIED_POSITIVE",
      }),
    ).toBe(60);
  });

  it("requires positive price and probability in opportunity scoring", () => {
    expect(
      calculateOpportunityCompleteness({
        name: "Inspeccion",
        companyId: "company-1",
        serviceId: "service-1",
        status: "EXPLORATION",
        probability: 0,
        price: 0,
      }),
    ).toBe(45);
  });

  it("scores a complete opportunity at 100", () => {
    expect(
      calculateOpportunityCompleteness({
        name: "Inspeccion",
        companyId: "company-1",
        primaryContactId: "contact-1",
        serviceId: "service-1",
        status: "PROPOSAL_SENT",
        certainty: "HIGH",
        probability: 0.8,
        businessUnit: "Termografia",
        price: 100,
        estimatedCloseDate: "2026-07-15",
        nextActionDate: "2026-06-30",
      }),
    ).toBe(100);
  });
});
