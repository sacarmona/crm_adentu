import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const databaseUrl = process.env.DATABASE_URL;
const filePath = process.argv[2];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}
if (!filePath) {
  throw new Error("Usage: node scripts/import-extra-data.mjs <path-to-xlsx>");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellValue(value) {
  if (value == null || typeof value !== "object" || value instanceof Date) {
    return value;
  }
  if ("result" in value) return value.result ?? null;
  if ("text" in value) return value.text;
  if ("richText" in value) return value.richText.map((p) => p.text).join("");
  return String(value);
}

function rowValues(worksheet, rowNumber, headers) {
  const data = {};
  headers.forEach((header, index) => {
    if (!header) return;
    data[header] = cellValue(worksheet.getRow(rowNumber).getCell(index + 1).value);
  });
  return data;
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

const interactionTypeMap = {
  correo: "EMAIL",
  whatsapp: "WHATSAPP",
  telefono: "PHONE",
  linkedin: "LINKEDIN",
  reunionclientefoconuevo: "NEW_FOCUS_CLIENT_MEETING",
  reuniononline: "ONLINE_MEETING",
  reunionpresencial: "IN_PERSON_MEETING",
  enviopropuesta: "PROPOSAL_SENT",
  seguimiento: "FOLLOW_UP",
  respuestadelcliente: "CLIENT_RESPONSE",
  otras: "OTHER",
};

const taskStatusMap = {
  pendiente: "PENDING",
  ejecutada: "EXECUTED",
  cerrado: "CLOSED",
};

function toKey(value) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, "");
}

async function loadHeaders(worksheet, headerRow) {
  const headers = [];
  worksheet.getRow(headerRow).eachCell({ includeEmpty: true }, (cell, column) => {
    headers[column - 1] = cellValue(cell.value);
  });
  return headers;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const [companies, contacts, opportunities, services] = await Promise.all([
    prisma.company.findMany({ where: { deletedAt: null }, select: { id: true, normalizedName: true } }),
    prisma.contact.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
    prisma.opportunity.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
    prisma.service.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);
  const companyMap = new Map(companies.map((c) => [c.normalizedName, c.id]));
  const contactMap = new Map(contacts.map((c) => [normalizeName(c.name), c.id]));
  const opportunityMap = new Map(opportunities.map((o) => [normalizeName(o.name), o.id]));
  const serviceMap = new Map(services.map((s) => [normalizeName(s.name), s.id]));

  // --- Interactions (INTE) ---
  const inteSheet = workbook.getWorksheet("INTE");
  const inteHeaders = await loadHeaders(inteSheet, 4);
  const interactionsData = [];
  inteSheet.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return;
    const raw = rowValues(inteSheet, rowNumber, inteHeaders);
    const date = asDate(raw["Fecha"]);
    const content = asText(raw["Contenido"]);
    if (!date || !content) return;

    const companyId = companyMap.get(normalizeName(raw["Empresa"])) ?? null;
    const contactId = contactMap.get(normalizeName(raw["Contacto"])) ?? null;
    const opportunityId = opportunityMap.get(normalizeName(raw["Oportunidad"])) ?? null;
    const serviceId = serviceMap.get(normalizeName(raw["Servicio Oportunidad"])) ?? null;
    const type = interactionTypeMap[toKey(raw["Tipo"])] ?? "OTHER";
    const nextActionStatusRaw = taskStatusMap[toKey(raw["Estado prox. acción"])] ?? null;

    interactionsData.push({
      date,
      companyId,
      contactId,
      opportunityId,
      serviceId,
      type,
      content,
      nextAction: asText(raw["Proxima acción"]),
      nextActionDate: asDate(raw["Fecha próx. acción"]),
      nextActionDueDate: asDate(raw["Vencimiento prox. acción"]),
      nextActionStatus: nextActionStatusRaw,
    });
  });

  let createdInteractions = 0;
  for (let i = 0; i < interactionsData.length; i += 200) {
    const chunk = interactionsData.slice(i, i + 200);
    const result = await prisma.interaction.createMany({ data: chunk });
    createdInteractions += result.count;
  }

  // --- Market assets (MERC) ---
  const mercSheet = workbook.getWorksheet("MERC");
  const mercHeaders = await loadHeaders(mercSheet, 4);
  const marketData = [];
  mercSheet.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return;
    const raw = rowValues(mercSheet, rowNumber, mercHeaders);
    const unitName = asText(raw["Nombre unidad"]);
    if (!unitName) return;

    const serviceId = serviceMap.get(normalizeName(raw["Servicio"])) ?? null;
    const ownerName = asText(raw["Propietaria"]);
    const constructionCompany = asText(raw["Constructora"]);
    const operationMaintenance = asText(raw["O&M"]);
    const quantityRaw = Number(raw["Cantidad"]);

    marketData.push({
      ownerName,
      unitName,
      serviceId,
      quantity: Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1,
      constructionCompany,
      operationMaintenance,
      otherRole: asText(raw["Otro rol"]),
      comment: asText(raw["Comentario"]),
      ownerCompanyId: ownerName ? companyMap.get(normalizeName(ownerName)) ?? null : null,
      constructionCompanyId: constructionCompany
        ? companyMap.get(normalizeName(constructionCompany)) ?? null
        : null,
      omCompanyId: operationMaintenance
        ? companyMap.get(normalizeName(operationMaintenance)) ?? null
        : null,
    });
  });

  let createdMarketAssets = 0;
  for (let i = 0; i < marketData.length; i += 200) {
    const chunk = marketData.slice(i, i + 200);
    const result = await prisma.marketAsset.createMany({ data: chunk });
    createdMarketAssets += result.count;
  }

  // --- Commercial milestones (Hitos Comerciales) ---
  const hitosSheet = workbook.getWorksheet("Hitos Comerciales");
  const hitosHeaders = await loadHeaders(hitosSheet, 2);
  const milestoneData = [];
  hitosSheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    const raw = rowValues(hitosSheet, rowNumber, hitosHeaders);
    const date = asDate(raw["Fecha"]);
    const project = asText(raw["Proyecto"]);
    if (!date || !project) return;

    milestoneData.push({
      date,
      companyId: companyMap.get(normalizeName(raw["Empresa"])) ?? null,
      project,
      industry: asText(raw["Industria"]),
    });
  });

  let createdMilestones = 0;
  for (let i = 0; i < milestoneData.length; i += 200) {
    const chunk = milestoneData.slice(i, i + 200);
    const result = await prisma.commercialMilestone.createMany({ data: chunk });
    createdMilestones += result.count;
  }

  console.log("Import complete:", {
    interactions: `${createdInteractions}/${interactionsData.length}`,
    marketAssets: `${createdMarketAssets}/${marketData.length}`,
    milestones: `${createdMilestones}/${milestoneData.length}`,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
