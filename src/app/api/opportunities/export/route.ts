import { OpportunityStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { followUpHealthLabels, opportunityStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  FOLLOW_UP_NORMAL_DAYS,
  FOLLOW_UP_STALLED_DAYS,
  FollowUpHealth,
  getFollowUpHealth,
} from "@/server/services/dashboard-metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const closedStatuses = [OpportunityStatus.WON, OpportunityStatus.LOST];
const pageWidth = 842;
const pageHeight = 595;
const margin = 28;
const rowHeight = 22;
const headerHeight = 78;
const footerHeight = 24;
const rowsPerPage = Math.floor(
  (pageHeight - headerHeight - footerHeight - margin) / rowHeight,
);

function buildFollowUpWhere(
  followUp: FollowUpHealth,
): Prisma.OpportunityWhereInput {
  if (followUp === "closed") {
    return { status: { in: closedStatuses } };
  }

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const normalBoundary = new Date(now - FOLLOW_UP_NORMAL_DAYS * day);
  const stalledBoundary = new Date(now - FOLLOW_UP_STALLED_DAYS * day);
  const notClosed: Prisma.OpportunityWhereInput = {
    status: { notIn: closedStatuses },
  };
  const referenceGte = (boundary: Date): Prisma.OpportunityWhereInput => ({
    OR: [
      { lastInteraction: { gte: boundary } },
      { lastInteraction: null, createdAt: { gte: boundary } },
    ],
  });
  const referenceLt = (boundary: Date): Prisma.OpportunityWhereInput => ({
    OR: [
      { lastInteraction: { lt: boundary } },
      { lastInteraction: null, createdAt: { lt: boundary } },
    ],
  });

  if (followUp === "normal") {
    return { AND: [notClosed, referenceGte(normalBoundary)] };
  }
  if (followUp === "stalled") {
    return { AND: [notClosed, referenceLt(stalledBoundary)] };
  }
  return {
    AND: [notClosed, referenceLt(normalBoundary), referenceGte(stalledBoundary)],
  };
}

function buildWhere(searchParams: URLSearchParams) {
  const q = searchParams.get("q")?.trim();
  const statusValues = searchParams
    .getAll("status")
    .filter((value): value is OpportunityStatus =>
      Object.values(OpportunityStatus).includes(value as OpportunityStatus),
    );
  const followUpValues = searchParams
    .getAll("followUp")
    .filter((value): value is FollowUpHealth =>
      ["normal", "watch", "stalled", "closed"].includes(value),
    );
  const responsibleId = searchParams.get("responsibleId");
  const hideClosed = searchParams.get("hideClosed") === "1";
  const conditions: Prisma.OpportunityWhereInput[] = [{ deletedAt: null }];

  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { company: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (statusValues.length) conditions.push({ status: { in: statusValues } });
  if (followUpValues.length) {
    conditions.push({ OR: followUpValues.map((value) => buildFollowUpWhere(value)) });
  }
  if (responsibleId === "none") conditions.push({ responsibleId: null });
  else if (responsibleId) conditions.push({ responsibleId });
  if (hideClosed) conditions.push({ status: { notIn: closedStatuses } });

  return {
    where: { AND: conditions } satisfies Prisma.OpportunityWhereInput,
    filters: { q, statusValues, followUpValues, responsibleId, hideClosed },
  };
}

function sanitizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fitText(value: unknown, maxLength: number) {
  const text = sanitizeText(value);
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}.` : text;
}

function pdfText(value: unknown) {
  const escaped = sanitizeText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  return `(${escaped})`;
}

function line(x: number, y: number, text: unknown, size = 9) {
  return `BT /F1 ${size} Tf ${x} ${y} Td ${pdfText(text)} Tj ET`;
}

function rect(x: number, y: number, width: number, height: number) {
  return `${x} ${y} ${width} ${height} re S`;
}

function formatFilters(filters: ReturnType<typeof buildWhere>["filters"]) {
  const parts = [];
  if (filters.q) parts.push(`Busqueda: ${filters.q}`);
  if (filters.statusValues.length) {
    parts.push(
      `Estados: ${filters.statusValues.map((value) => opportunityStatusLabels[value]).join(", ")}`,
    );
  }
  if (filters.followUpValues.length) {
    parts.push(
      `Seguimiento: ${filters.followUpValues.map((value) => followUpHealthLabels[value]).join(", ")}`,
    );
  }
  if (filters.responsibleId === "none") parts.push("Responsable: Sin responsable");
  if (filters.hideClosed) parts.push("Oculta cerradas");
  return parts.length ? parts.join(" | ") : "Sin filtros aplicados";
}

function createPdf(rows: string[][], filtersText: string) {
  const pages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = add("<< /Type /Catalog /Pages 2 0 R >>");
  void catalogId;
  const pagesId = add("PAGES_PLACEHOLDER");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];

  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const start = pageIndex * rowsPerPage;
    const pageRows = rows.slice(start, start + rowsPerPage);
    const content: string[] = [
      "0.10 0.19 0.34 RG",
      line(margin, pageHeight - 34, "CRM ADENTU - Listado de oportunidades", 15),
      line(margin, pageHeight - 52, `Generado: ${formatDate(new Date())}`, 8),
      line(margin, pageHeight - 66, fitText(filtersText, 150), 8),
      "0.72 0.80 0.89 RG",
      rect(margin, pageHeight - 92, pageWidth - margin * 2, 20),
      line(margin + 6, pageHeight - 86, "Oportunidad", 8),
      line(222, pageHeight - 86, "Empresa", 8),
      line(340, pageHeight - 86, "Responsable", 8),
      line(450, pageHeight - 86, "Estado", 8),
      line(548, pageHeight - 86, "Prob.", 8),
      line(596, pageHeight - 86, "Monto", 8),
      line(680, pageHeight - 86, "Seguimiento", 8),
      line(770, pageHeight - 86, "Cierre", 8),
    ];

    pageRows.forEach((row, index) => {
      const y = pageHeight - 112 - index * rowHeight;
      content.push("0.88 0.91 0.95 RG", rect(margin, y - 5, pageWidth - margin * 2, rowHeight));
      content.push(
        line(margin + 6, y, row[0], 8),
        line(222, y, row[1], 8),
        line(340, y, row[2], 8),
        line(450, y, row[3], 8),
        line(548, y, row[4], 8),
        line(596, y, row[5], 8),
        line(680, y, row[6], 8),
        line(770, y, row[7], 8),
      );
    });

    content.push(
      line(margin, 22, `Pagina ${pageIndex + 1} de ${pages} | ${rows.length} oportunidades`, 8),
    );

    const stream = content.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    const pageId = add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { where, filters } = buildWhere(request.nextUrl.searchParams);
  const sort =
    request.nextUrl.searchParams.get("sort") === "lastInteraction"
      ? "lastInteraction"
      : undefined;
  const dir = request.nextUrl.searchParams.get("dir") === "asc" ? "asc" : "desc";
  const opportunities = await prisma.opportunity.findMany({
    where,
    include: { company: true, responsible: true },
    orderBy: sort === "lastInteraction" ? { lastInteraction: dir } : { updatedAt: "desc" },
    take: 500,
  });
  const rows = opportunities.map((opportunity) => {
    const health = getFollowUpHealth(opportunity);
    return [
      fitText(opportunity.name, 32),
      fitText(opportunity.company?.name ?? "-", 20),
      fitText(opportunity.responsible?.name ?? "Sin responsable", 20),
      fitText(opportunityStatusLabels[opportunity.status], 18),
      formatPercent(opportunity.probability.toString()),
      fitText(formatCurrency(opportunity.totalAmount.toString()), 16),
      fitText(
        health.level === "closed"
          ? followUpHealthLabels[health.level]
          : `${followUpHealthLabels[health.level]} - ${health.days}d`,
        18,
      ),
      formatDate(opportunity.estimatedCloseDate),
    ];
  });
  const pdf = createPdf(rows, formatFilters(filters));

  return new NextResponse(pdf, {
    headers: {
      "Content-Disposition": `attachment; filename="oportunidades-${new Date().toISOString().slice(0, 10)}.pdf"`,
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
    },
  });
}
