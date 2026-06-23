import { ImportRowStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  normalizeHeaders,
  resolveImportTarget,
  summarizeImportRows,
  validateImportRow,
} from "./importer";

describe("Excel importer", () => {
  it("recognizes supported sheet aliases", () => {
    expect(resolveImportTarget("EMPR")).toBe("Company");
    expect(resolveImportTarget("Contactos")).toBe("Contact");
    expect(resolveImportTarget("OPORTUNIDADES")).toBe("Opportunity");
    expect(resolveImportTarget("Resumen")).toBeNull();
  });

  it("normalizes Spanish headers without accents", () => {
    expect(
      normalizeHeaders([
        "Nombre",
        "Región",
        "Cargo / Área",
        "Tipo Cambio",
      ]),
    ).toEqual(["name", "region", "roleArea", "exchangeRate"]);
  });

  it("validates and normalizes a company row", () => {
    const row = validateImportRow({
      sheetName: "Empresas",
      rowNumber: 2,
      targetModel: "Company",
      rawData: {
        name: "Empresa Demo",
        status: "Cliente activo",
        region: "Biobio",
      },
    });

    expect(row.status).toBe(ImportRowStatus.VALID);
    expect(row.normalizedData).toMatchObject({
      name: "Empresa Demo",
      status: "ACTIVE_CLIENT",
      region: "Biobio",
    });
  });

  it("converts percentage probability and localized numbers", () => {
    const row = validateImportRow({
      sheetName: "Oportunidades",
      rowNumber: 2,
      targetModel: "Opportunity",
      rawData: {
        name: "Inspeccion demo",
        probability: "75%",
        price: "1.250.000",
        exchangeRate: 1,
        quantity: 2,
        months: 3,
      },
    });

    expect(row.status).toBe(ImportRowStatus.VALID);
    expect(row.normalizedData).toMatchObject({
      price: 1_250_000,
      probability: 0.75,
    });
  });

  it("reports missing required names and summarizes rows", () => {
    const errorRow = validateImportRow({
      sheetName: "Contactos",
      rowNumber: 4,
      targetModel: "Contact",
      rawData: { email: "persona@example.com" },
    });
    const validRow = validateImportRow({
      sheetName: "Empresas",
      rowNumber: 2,
      targetModel: "Company",
      rawData: { name: "Empresa Demo" },
    });

    expect(errorRow.status).toBe(ImportRowStatus.ERROR);
    expect(summarizeImportRows([errorRow, validRow])).toMatchObject({
      total: 2,
      valid: 1,
      errors: 1,
      byModel: { Company: 1, Contact: 1, Opportunity: 0 },
    });
  });
});
