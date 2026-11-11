import { LeadStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  completedWeekdays,
  countUniqueLeads,
  expectedToDate,
  kpiLight,
  leadKey,
  statusLight,
  statusReadings,
  weekStart,
  weeklyResults,
} from "./lead-kpi";

// Fechas en hora Chile (UTC-4): el sufijo -04:00 evita ambiguedades.
const at = (iso: string) => new Date(`${iso}-04:00`);

describe("weekStart", () => {
  it("devuelve el lunes 00:00 hora Chile", () => {
    // Miercoles 2026-11-11 15:00 -> lunes 2026-11-09 00:00 (-04:00)
    expect(weekStart(at("2026-11-11T15:00:00")).toISOString()).toBe(at("2026-11-09T00:00:00").toISOString());
  });

  it("el domingo pertenece a la semana que empezo el lunes anterior", () => {
    expect(weekStart(at("2026-11-15T23:30:00")).toISOString()).toBe(at("2026-11-09T00:00:00").toISOString());
  });

  it("el lunes a las 00:00 es el inicio de su propia semana", () => {
    expect(weekStart(at("2026-11-09T00:00:00")).toISOString()).toBe(at("2026-11-09T00:00:00").toISOString());
  });
});

describe("completedWeekdays / expectedToDate", () => {
  it("lunes 0, martes 1, viernes 4, sabado y domingo 5", () => {
    expect(completedWeekdays(at("2026-11-09T10:00:00"))).toBe(0);
    expect(completedWeekdays(at("2026-11-10T10:00:00"))).toBe(1);
    expect(completedWeekdays(at("2026-11-13T10:00:00"))).toBe(4);
    expect(completedWeekdays(at("2026-11-14T10:00:00"))).toBe(5);
    expect(completedWeekdays(at("2026-11-15T10:00:00"))).toBe(5);
  });

  it("prorratea la meta de 20 por dias habiles", () => {
    expect(expectedToDate(at("2026-11-09T10:00:00"))).toBe(0);
    expect(expectedToDate(at("2026-11-10T10:00:00"))).toBe(4);
    expect(expectedToDate(at("2026-11-12T10:00:00"))).toBe(12);
    expect(expectedToDate(at("2026-11-14T10:00:00"))).toBe(20);
  });
});

describe("leadKey / countUniqueLeads", () => {
  const lead = (contactName: string, companyName: string | null, serviceId: string | null) => ({
    contactName,
    companyName,
    serviceId,
  });

  it("misma empresa y mismo servicio cuenta como un solo lead", () => {
    expect(
      countUniqueLeads([lead("Ana", "Enel Chile", "s1"), lead("Luis", "ENEL  chile", "s1"), lead("Eva", "Enel Chile", "s1")]),
    ).toBe(1);
  });

  it("misma empresa con servicios distintos cuenta por separado", () => {
    expect(countUniqueLeads([lead("Ana", "Enel", "s1"), lead("Luis", "Enel", "s2")])).toBe(2);
  });

  it("empresas distintas con el mismo servicio cuentan por separado", () => {
    expect(countUniqueLeads([lead("Ana", "Enel", "s1"), lead("Luis", "Colbun", "s1")])).toBe(2);
  });

  it("ignora mayusculas, tildes y espacios al comparar empresas", () => {
    expect(leadKey(lead("A", "  Colbún ", "s1"))).toBe(leadKey(lead("B", "colbun", "s1")));
  });

  it("sin servicio se agrupa como 'sin servicio'", () => {
    expect(countUniqueLeads([lead("Ana", "Enel", null), lead("Luis", "Enel", null)])).toBe(1);
  });

  it("sin empresa cada contacto cuenta por si solo", () => {
    expect(countUniqueLeads([lead("Ana", null, "s1"), lead("Luis", null, "s1"), lead("ana", null, "s2")])).toBe(2);
  });
});

describe("kpiLight", () => {
  it("lunes (nada esperado) es neutral", () => {
    expect(kpiLight(0, 0)).toBe("neutral");
  });
  it("verde con el 100% o mas del esperado", () => {
    expect(kpiLight(12, 12)).toBe("green");
    expect(kpiLight(15, 12)).toBe("green");
  });
  it("amarillo entre 70% y 99%", () => {
    expect(kpiLight(9, 12)).toBe("yellow"); // 75%
    expect(kpiLight(14, 20)).toBe("yellow"); // 70% exacto
  });
  it("rojo bajo 70%", () => {
    expect(kpiLight(8, 12)).toBe("red"); // 66%
    expect(kpiLight(0, 4)).toBe("red");
  });
});

describe("weeklyResults", () => {
  const leads = [
    { contactName: "A", companyName: "Enel", serviceId: "s1", createdAt: at("2026-11-09T09:00:00") },
    { contactName: "B", companyName: "Enel", serviceId: "s1", createdAt: at("2026-11-10T09:00:00") },
    { contactName: "C", companyName: "Colbun", serviceId: "s1", createdAt: at("2026-11-11T09:00:00") },
    { contactName: "D", companyName: "Enel", serviceId: "s1", createdAt: at("2026-11-03T09:00:00") },
  ];

  it("agrupa por semana y deduplica dentro de cada una", () => {
    const result = weeklyResults(leads, at("2026-11-12T10:00:00"), 2);
    expect(result).toHaveLength(2);
    // Semana anterior (03-nov): 1 lead
    expect(result[0]).toMatchObject({ gross: 1, unique: 1 });
    // Semana en curso (09-nov): 3 contactos, 2 unicos (Enel+s1 y Colbun+s1)
    expect(result[1]).toMatchObject({ gross: 3, unique: 2 });
  });

  it("el limite superior de la semana es exclusivo (el lunes siguiente cuenta en la otra)", () => {
    const edge = [{ contactName: "X", companyName: "Z", serviceId: null, createdAt: at("2026-11-16T00:00:00") }];
    const result = weeklyResults(edge, at("2026-11-12T10:00:00"), 1);
    expect(result[0].gross).toBe(0);
  });
});

describe("statusLight / statusReadings", () => {
  it("con muestra pequena no emite veredicto", () => {
    expect(statusLight("sinRespuesta", 80, 4)).toBe("neutral");
  });

  it("sin respuesta y descartados: mas bajo es mejor", () => {
    expect(statusLight("sinRespuesta", 20, 10)).toBe("green");
    expect(statusLight("sinRespuesta", 30, 10)).toBe("yellow");
    expect(statusLight("sinRespuesta", 50, 10)).toBe("red");
    expect(statusLight("descartados", 15, 10)).toBe("green");
    expect(statusLight("descartados", 31, 10)).toBe("red");
  });

  it("calificados y contactados: mas alto es mejor", () => {
    expect(statusLight("calificados", 25, 10)).toBe("green");
    expect(statusLight("calificados", 12, 10)).toBe("yellow");
    expect(statusLight("calificados", 5, 10)).toBe("red");
    expect(statusLight("contactados", 30, 10)).toBe("green");
    expect(statusLight("contactados", 10, 10)).toBe("red");
  });

  it("cuenta cada estado y suma convertidos a calificados", () => {
    const statuses = [
      LeadStatus.NUEVO,
      LeadStatus.SIN_RESPUESTA,
      LeadStatus.SIN_RESPUESTA,
      LeadStatus.DESCARTADO,
      LeadStatus.CALIFICADO,
      LeadStatus.CONVERTIDO,
      LeadStatus.CONTACTADO,
      LeadStatus.CONTACTADO,
      LeadStatus.CONTACTADO,
      LeadStatus.CONTACTADO,
    ];
    const r = statusReadings(statuses);
    expect(r.total).toBe(10);
    expect(r.nuevos).toBe(1);
    expect(r.convertidos).toBe(1);
    const by = Object.fromEntries(r.readings.map((x) => [x.key, x]));
    expect(by.sinRespuesta).toMatchObject({ count: 2, percent: 20, light: "green" });
    expect(by.descartados).toMatchObject({ count: 1, percent: 10, light: "green" });
    expect(by.calificados).toMatchObject({ count: 2, percent: 20, light: "yellow" });
    expect(by.contactados).toMatchObject({ count: 4, percent: 40, light: "green" });
  });

  it("sin leads no rompe (todo en cero y neutral)", () => {
    const r = statusReadings([]);
    expect(r.total).toBe(0);
    expect(r.readings.every((x) => x.count === 0 && x.light === "neutral")).toBe(true);
  });
});
