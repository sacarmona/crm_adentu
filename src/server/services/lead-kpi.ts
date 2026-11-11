import { LeadStatus } from "@prisma/client";

import { normalizeName } from "../../lib/normalize";

/** Meta de leads nuevos únicos por semana (captación). */
export const WEEKLY_LEAD_GOAL = 20;

/**
 * Meta de leads nuevos únicos CON RESPUESTA por semana (contactado, calificado o convertido).
 * Se mide sobre los leads creados en la semana, igual que la captación.
 */
export const WEEKLY_RESPONDED_GOAL = 10;

/**
 * Semaforo de ambos KPI semanales (captados y con respuesta): cumplimiento = leads / esperado a la fecha.
 * Verde >= 100%, amarillo >= 70%, rojo por debajo. Las semanas cerradas se juzgan contra la meta completa.
 */
export const KPI_GREEN_AT = 1; // >= 100% del esperado
export const KPI_YELLOW_AT = 0.7; // >= 70% del esperado

export type Light = "green" | "yellow" | "red" | "neutral";

// Chile se trata como UTC-4 fijo, igual que el resto del CRM (ver lib/normalize.ts y lib/format.ts).
const CHILE_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Lunes 00:00 (hora Chile) de la semana que contiene `date`. */
export function weekStart(date: Date): Date {
  const local = new Date(date.getTime() - CHILE_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const localMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysSinceMonday,
  );
  return new Date(localMidnight + CHILE_OFFSET_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Dias habiles (lun-vie) ya terminados esta semana, sin contar hoy: lunes 0 ... sabado/domingo 5. */
export function completedWeekdays(now: Date): number {
  const local = new Date(now.getTime() - CHILE_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  return Math.min(daysSinceMonday, 5);
}

export type KpiLead = {
  contactName: string;
  companyName: string | null;
  serviceId: string | null;
};

/**
 * Clave de unicidad de un lead para el KPI: empresa + servicio.
 * - Dos contactos de la misma empresa por el mismo servicio cuentan como UN lead.
 * - La misma empresa con servicios distintos cuenta como leads distintos.
 * - Sin servicio se agrupa como "sin servicio".
 * - Sin empresa no se puede deduplicar: cada contacto cuenta por si solo.
 */
export function leadKey(lead: KpiLead): string {
  const company = normalizeName(lead.companyName ?? "");
  if (!company) return `contacto:${normalizeName(lead.contactName)}`;
  return `${company}|${lead.serviceId ?? "sin-servicio"}`;
}

export function countUniqueLeads(leads: readonly KpiLead[]): number {
  return new Set(leads.map(leadKey)).size;
}

/**
 * Semaforo del KPI semanal.
 * `expected` es lo que deberia llevarse a la fecha (meta prorrateada por dias habiles).
 * Si aun no se espera nada (lunes), no hay veredicto: neutral.
 */
export function kpiLight(count: number, expected: number): Light {
  if (expected <= 0) return "neutral";
  const ratio = count / expected;
  if (ratio >= KPI_GREEN_AT) return "green";
  if (ratio >= KPI_YELLOW_AT) return "yellow";
  return "red";
}

/** Meta prorrateada por dias habiles transcurridos de la semana en curso. */
export function expectedToDate(now: Date, goal = WEEKLY_LEAD_GOAL): number {
  return Math.round((goal * completedWeekdays(now)) / 5);
}

/**
 * Estados que cuentan como "con respuesta": el lead ya tuvo contacto efectivo con el cliente.
 * Quedan fuera Nuevo (sin gestionar), Sin respuesta (se intento y no contestaron) y Descartado.
 */
export const RESPONDED_STATUSES: readonly LeadStatus[] = [
  LeadStatus.CONTACTADO,
  LeadStatus.CALIFICADO,
  LeadStatus.CONVERTIDO,
];

export function isResponded(status: LeadStatus): boolean {
  return RESPONDED_STATUSES.includes(status);
}

export type WeekResult = {
  start: Date;
  /** Leads nuevos sin deduplicar (contactos). */
  gross: number;
  /** Leads nuevos unicos empresa + servicio: la CAPTACION (el KPI con semaforo). */
  unique: number;
  /** De los captados, los unicos empresa + servicio que ya tuvieron respuesta del cliente. */
  responded: number;
};

/** Resultados de las ultimas `weeks` semanas (la primera es la mas antigua y la ultima la semana en curso). */
export function weeklyResults(
  leads: readonly (KpiLead & { createdAt: Date; status: LeadStatus })[],
  now: Date,
  weeks: number,
): WeekResult[] {
  const current = weekStart(now);
  const results: WeekResult[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = addDays(current, -7 * i);
    const end = addDays(start, 7);
    const inWeek = leads.filter((lead) => lead.createdAt >= start && lead.createdAt < end);
    results.push({
      start,
      gross: inWeek.length,
      unique: countUniqueLeads(inWeek),
      responded: countUniqueLeads(inWeek.filter((lead) => isResponded(lead.status))),
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Lectura de estados (leads creados en el periodo del Dashboard)
// ---------------------------------------------------------------------------

export type StatusReadingKey = "sinRespuesta" | "descartados" | "calificados" | "contactados";

/** Minimo de leads en el periodo para emitir un veredicto; con menos, el semaforo es neutral. */
export const MIN_SAMPLE = 5;

type Rule = { goodWhen: "low" | "high"; green: number; yellow: number };

/**
 * Umbrales propuestos (porcentaje de los leads del periodo).
 * - "low": mientras mas bajo mejor (verde <= green, amarillo <= yellow, rojo en otro caso).
 * - "high": mientras mas alto mejor (verde >= green, amarillo >= yellow, rojo en otro caso).
 */
export const STATUS_RULES: Record<StatusReadingKey, Rule> = {
  sinRespuesta: { goodWhen: "low", green: 20, yellow: 35 },
  descartados: { goodWhen: "low", green: 15, yellow: 30 },
  calificados: { goodWhen: "high", green: 25, yellow: 10 },
  contactados: { goodWhen: "high", green: 30, yellow: 15 },
};

export function statusLight(key: StatusReadingKey, percent: number, total: number): Light {
  if (total < MIN_SAMPLE) return "neutral";
  const rule = STATUS_RULES[key];
  if (rule.goodWhen === "low") {
    if (percent <= rule.green) return "green";
    if (percent <= rule.yellow) return "yellow";
    return "red";
  }
  if (percent >= rule.green) return "green";
  if (percent >= rule.yellow) return "yellow";
  return "red";
}

export type StatusReading = {
  key: StatusReadingKey;
  label: string;
  count: number;
  percent: number;
  light: Light;
};

/** Cuenta los estados pedidos sobre los leads del periodo. "Calificados" incluye los ya convertidos. */
export function statusReadings(statuses: readonly LeadStatus[]): {
  total: number;
  nuevos: number;
  convertidos: number;
  readings: StatusReading[];
} {
  const total = statuses.length;
  const count = (...wanted: LeadStatus[]) => statuses.filter((s) => wanted.includes(s)).length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const defs: { key: StatusReadingKey; label: string; n: number }[] = [
    { key: "sinRespuesta", label: "Sin respuesta", n: count(LeadStatus.SIN_RESPUESTA) },
    { key: "descartados", label: "Descartados", n: count(LeadStatus.DESCARTADO) },
    { key: "calificados", label: "Calificados", n: count(LeadStatus.CALIFICADO, LeadStatus.CONVERTIDO) },
    { key: "contactados", label: "Contactados", n: count(LeadStatus.CONTACTADO) },
  ];

  return {
    total,
    nuevos: count(LeadStatus.NUEVO),
    convertidos: count(LeadStatus.CONVERTIDO),
    readings: defs.map(({ key, label, n }) => ({
      key,
      label,
      count: n,
      percent: pct(n),
      light: statusLight(key, pct(n), total),
    })),
  };
}
