// Fixed UTC-4 (no DST), matching the offset already used in lib/normalize.ts.
const APP_TIME_ZONE = "Etc/GMT+4";

export function formatDate(value?: Date | string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

export function formatTime(value?: Date | string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

export function formatCurrency(value: number | string, currency = "CLP") {
  const amount = Number(value);

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(value: number | string) {
  const amount = Number(value);

  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}
