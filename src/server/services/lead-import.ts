import ExcelJS from "exceljs";
import { ContactMedium } from "@prisma/client";

export const MAX_LEAD_IMPORT_ROWS = 1_000;
export const MAX_LEAD_IMPORT_BYTES = 5 * 1024 * 1024;

export type LeadImportRow = {
  rowNumber: number;
  contactName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  medium: ContactMedium;
  lastContactAt: string | null; // YYYY-MM-DD
  notes: string | null;
  valid: boolean;
  issue: string | null;
};

export type LeadImportPreview = {
  rows: LeadImportRow[];
  total: number;
  validCount: number;
  errorCount: number;
  error?: string;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const headerAliases: Record<string, keyof LeadImportRow> = {
  contacto: "contactName",
  contact: "contactName",
  nombre: "contactName",
  nombrecontacto: "contactName",
  empresa: "companyName",
  company: "companyName",
  medio: "medium",
  mediocontacto: "medium",
  canal: "medium",
  email: "email",
  correo: "email",
  telefono: "phone",
  fono: "phone",
  celular: "phone",
  phone: "phone",
  ultimocontacto: "lastContactAt",
  fechacontacto: "lastContactAt",
  fecha: "lastContactAt",
  fechaultimocontacto: "lastContactAt",
  notas: "notes",
  nota: "notes",
  observaciones: "notes",
};

const mediumAliases: Record<string, ContactMedium> = {
  telefono: ContactMedium.TELEFONO,
  fono: ContactMedium.TELEFONO,
  llamada: ContactMedium.TELEFONO,
  whatsapp: ContactMedium.WHATSAPP,
  wsp: ContactMedium.WHATSAPP,
  whatsap: ContactMedium.WHATSAPP,
  email: ContactMedium.EMAIL,
  correo: ContactMedium.EMAIL,
  mail: ContactMedium.EMAIL,
  linkedin: ContactMedium.LINKEDIN,
  presencial: ContactMedium.PRESENCIAL,
  reunion: ContactMedium.PRESENCIAL,
  otro: ContactMedium.OTRO,
};

function text(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function resolveMedium(value: unknown): ContactMedium {
  const key = normalizeHeader(value);
  return mediumAliases[key] ?? ContactMedium.TELEFONO;
}

function resolveDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  // DD-MM-YYYY o DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function buildRow(
  headerMap: (keyof LeadImportRow | null)[],
  cells: unknown[],
  rowNumber: number,
): LeadImportRow | null {
  const record: Partial<Record<keyof LeadImportRow, unknown>> = {};
  let hasContent = false;
  headerMap.forEach((field, index) => {
    if (!field) return;
    const value = cells[index];
    if (value != null && String(value).trim() !== "") hasContent = true;
    record[field] = value;
  });
  if (!hasContent) return null;

  const contactName = text(record.contactName);
  const row: LeadImportRow = {
    rowNumber,
    contactName: contactName ?? "",
    companyName: text(record.companyName),
    email: text(record.email),
    phone: text(record.phone),
    medium: resolveMedium(record.medium),
    lastContactAt: resolveDate(record.lastContactAt),
    notes: text(record.notes),
    valid: true,
    issue: null,
  };
  if (!contactName) {
    row.valid = false;
    row.issue = "Falta el nombre de contacto.";
  }
  return row;
}

// Parser CSV minimal con soporte de comillas dobles.
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function mapHeaders(rawHeaders: unknown[]): (keyof LeadImportRow | null)[] {
  return rawHeaders.map((header) => headerAliases[normalizeHeader(header)] ?? null);
}

export function parseLeadsCsv(content: string): LeadImportRow[] {
  const matrix = parseCsv(content);
  if (matrix.length === 0) return [];
  const headerMap = mapHeaders(matrix[0]);
  const rows: LeadImportRow[] = [];
  for (let i = 1; i < matrix.length && rows.length < MAX_LEAD_IMPORT_ROWS; i += 1) {
    const built = buildRow(headerMap, matrix[i], i + 1);
    if (built) rows.push(built);
  }
  return rows;
}

export async function parseLeadsXlsx(buffer: Buffer): Promise<LeadImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rawHeaders: unknown[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
    rawHeaders[column - 1] = cell.text ?? cell.value;
  });
  const headerMap = mapHeaders(rawHeaders);

  const rows: LeadImportRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || rows.length >= MAX_LEAD_IMPORT_ROWS) return;
    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      const value = cell.value;
      cells[column - 1] =
        value && typeof value === "object" && !(value instanceof Date)
          ? cell.text
          : value;
    });
    const built = buildRow(headerMap, cells, rowNumber);
    if (built) rows.push(built);
  });
  return rows;
}
