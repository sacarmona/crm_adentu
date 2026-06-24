import {
  Certainty,
  CompanyStatus,
  ContactStatus,
  Currency,
  ImportRowStatus,
  LeadSource,
  OpportunityStatus,
} from "@prisma/client";
import { z } from "zod";

import { normalizeName } from "../../lib/normalize";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1_000;

export type ImportTarget = "Company" | "Contact" | "Opportunity";

export type ParsedImportRow = {
  sheetName: string;
  rowNumber: number;
  targetModel: ImportTarget;
  status: ImportRowStatus;
  rawData: Record<string, unknown>;
  normalizedData: Record<string, unknown> | null;
  issues: string[];
};

const sheetAliases: Record<string, ImportTarget> = {
  empresas: "Company",
  empresa: "Company",
  empr: "Company",
  companies: "Company",
  contactos: "Contact",
  contacto: "Contact",
  cont: "Contact",
  contacts: "Contact",
  oportunidades: "Opportunity",
  oportunidad: "Opportunity",
  opor: "Opportunity",
  opportunities: "Opportunity",
};

const fieldAliases: Record<string, string> = {
  nombre: "name",
  empresa: "companyName",
  nombreempresa: "companyName",
  industria: "industry",
  region: "region",
  estado: "status",
  tamano: "size",
  notas: "notes",
  cargo: "roleArea",
  area: "roleArea",
  cargoarea: "roleArea",
  correo: "email",
  email: "email",
  telefono: "phone",
  celular: "phone",
  origen: "leadSource",
  origenlead: "leadSource",
  contacto: "contactName",
  contactoprincipal: "contactName",
  servicio: "serviceName",
  certeza: "certainty",
  probabilidad: "probability",
  unidad: "businessUnit",
  unidadnegocio: "businessUnit",
  moneda: "currency",
  precio: "price",
  tipocambio: "exchangeRate",
  cantidad: "quantity",
  meses: "months",
  cierreestimado: "estimatedCloseDate",
  inicioestimado: "estimatedStartDate",
  proximaaccion: "nextActionDate",
};

const companySchema = z.object({
  name: z.string().trim().min(2),
  industry: z.string().nullable(),
  region: z.string().nullable(),
  status: z.nativeEnum(CompanyStatus),
  size: z.string().nullable(),
  notes: z.string().nullable(),
});

const contactSchema = z.object({
  name: z.string().trim().min(2),
  companyName: z.string().nullable(),
  roleArea: z.string().nullable(),
  status: z.nativeEnum(ContactStatus),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  leadSource: z.nativeEnum(LeadSource).nullable(),
  notes: z.string().nullable(),
});

const opportunitySchema = z.object({
  name: z.string().trim().min(2),
  companyName: z.string().nullable(),
  contactName: z.string().nullable(),
  serviceName: z.string().nullable(),
  status: z.nativeEnum(OpportunityStatus),
  certainty: z.nativeEnum(Certainty).nullable(),
  probability: z.number().min(0).max(1),
  businessUnit: z.string().nullable(),
  currency: z.nativeEnum(Currency),
  price: z.number().min(0),
  exchangeRate: z.number().positive(),
  quantity: z.number().int().positive(),
  months: z.number().int().positive(),
  estimatedCloseDate: z.string().nullable(),
  estimatedStartDate: z.string().nullable(),
  nextActionDate: z.string().nullable(),
});

const enumAliases: Record<string, string> = {
  sincaliificar: "UNQUALIFIED",
  sincalificar: "UNQUALIFIED",
  nocalificado: "UNQUALIFIED",
  prospeccion: "PROSPECTING",
  enprospeccion: "PROSPECTING",
  clientehistorico: "HISTORIC_CLIENT",
  clienteactivo: "ACTIVE_CLIENT",
  descartado: "DISCARDED",
  calificadopositivo: "QUALIFIED_POSITIVE",
  conoportunidad: "WITH_OPPORTUNITY",
  cliente: "CLIENT",
  calificadonegativo: "QUALIFIED_NEGATIVE",
  exploracion: "EXPLORATION",
  propuestaenviada: "PROPOSAL_SENT",
  negociacion: "NEGOTIATION",
  ganada: "WON",
  cerradaganada: "WON",
  estancada: "STALLED",
  perdido: "LOST",
  perdida: "LOST",
  cerradaperdida: "LOST",
  alta: "HIGH",
  media: "MEDIUM",
  baja: "LOW",
  inboundcorreo: "INBOUND_EMAIL",
  inboundtelwsp: "INBOUND_PHONE_WHATSAPP",
  inboundtelefonowhatsapp: "INBOUND_PHONE_WHATSAPP",
  inboundotro: "INBOUND_OTHER",
  outboundconsultivo: "OUTBOUND_CONSULTATIVE",
  outboundrelacional: "OUTBOUND_RELATIONAL",
  outboundferias: "OUTBOUND_FAIRS",
  outboundotro: "OUTBOUND_OTHER",
};

export function normalizeImportKey(value: unknown) {
  return normalizeName(String(value ?? ""))
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function resolveImportTarget(sheetName: string) {
  return sheetAliases[normalizeImportKey(sheetName)] ?? null;
}

export function normalizeHeaders(headers: unknown[]) {
  return headers.map((header) => {
    const key = normalizeImportKey(header);
    return fieldAliases[key] ?? key;
  });
}

function nullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function nullableEmail(value: unknown) {
  const text = nullableText(value);
  if (!text) {
    return null;
  }

  // Strip "Name <email@domain>" wrapping and stray punctuation pasted from
  // email signatures (unmatched "<", ">", trailing commas/semicolons), keeping
  // only the address itself.
  const match = text.match(/<([^<>]+)>/);
  const cleaned = (match ? match[1] : text)
    .replace(/[<>,;]/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function enumValue(value: unknown, fallback: string) {
  const text = nullableText(value);
  if (!text) {
    return fallback;
  }

  // Dictionary values follow "+3 - Cliente activo" / "-1 - Perdido"; strip the
  // leading numeric code so it matches the alias keys, which are coded without it.
  const withoutCode = text.replace(/^[+-]?\d+\s*-\s*/, "");
  const direct = withoutCode.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return enumAliases[normalizeImportKey(withoutCode)] ?? direct;
}

function numberValue(value: unknown, fallback: number) {
  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value ?? "")
    .trim()
    .replace("%", "")
    .replace(/\s/g, "")
    .replace(/(?<=\d)\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function probabilityValue(value: unknown) {
  const parsed = numberValue(value, 0);
  return String(value ?? "").includes("%") || parsed > 1 ? parsed / 100 : parsed;
}

function dateValue(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function normalizeRow(
  target: ImportTarget,
  rawData: Record<string, unknown>,
) {
  if (target === "Company") {
    return {
      name: nullableText(rawData.name) ?? "",
      industry: nullableText(rawData.industry),
      region: nullableText(rawData.region),
      status: enumValue(rawData.status, CompanyStatus.UNQUALIFIED),
      size: nullableText(rawData.size),
      notes: nullableText(rawData.notes),
    };
  }

  if (target === "Contact") {
    return {
      name: nullableText(rawData.name) ?? "",
      companyName: nullableText(rawData.companyName),
      roleArea: nullableText(rawData.roleArea),
      status: enumValue(rawData.status, ContactStatus.UNQUALIFIED),
      email: nullableEmail(rawData.email)?.toLowerCase() ?? null,
      phone: nullableText(rawData.phone),
      leadSource: rawData.leadSource
        ? enumValue(rawData.leadSource, LeadSource.INBOUND_OTHER)
        : null,
      notes: nullableText(rawData.notes),
    };
  }

  return {
    name: nullableText(rawData.name) ?? "",
    companyName: nullableText(rawData.companyName),
    contactName: nullableText(rawData.contactName),
    serviceName: nullableText(rawData.serviceName),
    status: enumValue(rawData.status, OpportunityStatus.EXPLORATION),
    certainty: rawData.certainty
      ? enumValue(rawData.certainty, Certainty.LOW)
      : null,
    probability: probabilityValue(rawData.probability),
    businessUnit: nullableText(rawData.businessUnit),
    currency: enumValue(rawData.currency, Currency.CLP),
    price: numberValue(rawData.price, 0),
    exchangeRate: numberValue(rawData.exchangeRate, 1),
    quantity: numberValue(rawData.quantity, 1),
    months: numberValue(rawData.months, 1),
    estimatedCloseDate: dateValue(rawData.estimatedCloseDate),
    estimatedStartDate: dateValue(rawData.estimatedStartDate),
    nextActionDate: dateValue(rawData.nextActionDate),
  };
}

export function validateImportRow(input: {
  sheetName: string;
  rowNumber: number;
  targetModel: ImportTarget;
  rawData: Record<string, unknown>;
}): ParsedImportRow {
  const normalizedData = normalizeRow(input.targetModel, input.rawData);
  const schema =
    input.targetModel === "Company"
      ? companySchema
      : input.targetModel === "Contact"
        ? contactSchema
        : opportunitySchema;
  const result = schema.safeParse(normalizedData);
  const issues = result.success
    ? []
    : result.error.issues.map(
        (issue) => `${issue.path.join(".") || "fila"}: ${issue.message}`,
      );

  return {
    ...input,
    status: result.success ? ImportRowStatus.VALID : ImportRowStatus.ERROR,
    normalizedData: result.success
      ? (result.data as Record<string, unknown>)
      : normalizedData,
    issues,
  };
}

export function summarizeImportRows(rows: ParsedImportRow[]) {
  return {
    total: rows.length,
    valid: rows.filter((row) => row.status === ImportRowStatus.VALID).length,
    warnings: rows.filter((row) => row.status === ImportRowStatus.WARNING).length,
    errors: rows.filter((row) => row.status === ImportRowStatus.ERROR).length,
    byModel: {
      Company: rows.filter((row) => row.targetModel === "Company").length,
      Contact: rows.filter((row) => row.targetModel === "Contact").length,
      Opportunity: rows.filter((row) => row.targetModel === "Opportunity").length,
    },
  };
}
