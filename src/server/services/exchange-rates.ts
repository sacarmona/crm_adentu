import { Currency } from "@prisma/client";

const INDICATOR_BY_CURRENCY: Partial<Record<Currency, string>> = {
  UF: "uf",
  USD: "dolar",
  EUR: "euro",
};

type IndicatorResponse = {
  serie?: Array<{ fecha: string; valor: number }>;
};

function chileDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function apiDate(date: Date) {
  const [year, month, day] = chileDate(date).split("-");
  return `${day}-${month}-${year}`;
}

export async function historicalClpRate(currency: Currency, requestedAt: Date) {
  if (currency === Currency.CLP) {
    return { rate: 1, observedAt: requestedAt, source: "CLP" };
  }
  const indicator = INDICATOR_BY_CURRENCY[currency];
  if (!indicator) return null;

  for (let offset = 0; offset <= 7; offset += 1) {
    const date = new Date(requestedAt.getTime() - offset * 24 * 60 * 60 * 1000);
    const response = await fetch(`https://mindicador.cl/api/${indicator}/${apiDate(date)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) continue;
    const payload = (await response.json()) as IndicatorResponse;
    const value = payload.serie?.[0];
    if (value && Number.isFinite(value.valor) && value.valor > 0) {
      return {
        rate: value.valor,
        observedAt: new Date(value.fecha),
        source: `mindicador.cl/${indicator}`,
      };
    }
  }
  return null;
}
