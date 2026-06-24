"use server";

import {
  AuditAction,
  ImportBatchStatus,
  ImportRowStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeName } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { calculateCompanyCompleteness, calculateContactCompleteness, calculateOpportunityCompleteness } from "@/server/services/completeness-scoring";
import { readExcelImport } from "@/server/services/excel-reader";
import {
  MAX_IMPORT_FILE_BYTES,
  ParsedImportRow,
  summarizeImportRows,
} from "@/server/services/importer";
import { calculateOpportunityAmounts } from "@/server/services/opportunity-calculations";
import { requireAdmin } from "@/server/authz";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function markDuplicates(rows: ParsedImportRow[]) {
  const [companies, contacts, opportunities, services] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { normalizedName: true },
    }),
    prisma.contact.findMany({
      where: { deletedAt: null, email: { not: null } },
      select: { email: true },
    }),
    prisma.opportunity.findMany({
      where: { deletedAt: null },
      select: { name: true },
    }),
    prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { name: true },
    }),
  ]);
  const companyNames = new Set(companies.map((item) => item.normalizedName));
  const contactEmails = new Set(
    contacts.flatMap((item) => (item.email ? [item.email.toLowerCase()] : [])),
  );
  const opportunityNames = new Set(
    opportunities.map((item) => normalizeName(item.name)),
  );
  const serviceNames = new Set(
    services.map((item) => normalizeName(item.name)),
  );
  const incomingCompanyNames = new Set(
    rows
      .filter((row) => row.targetModel === "Company" && row.normalizedData)
      .map((row) => normalizeName(String(row.normalizedData?.name))),
  );
  const incomingContactNames = new Set(
    rows
      .filter((row) => row.targetModel === "Contact" && row.normalizedData)
      .map((row) => normalizeName(String(row.normalizedData?.name))),
  );
  const existingContactNames = new Set(
    (
      await prisma.contact.findMany({
        where: { deletedAt: null },
        select: { name: true },
      })
    ).map((item) => normalizeName(item.name)),
  );

  return rows.map((row) => {
    if (row.status === ImportRowStatus.ERROR || !row.normalizedData) {
      return row;
    }

    const duplicate =
      (row.targetModel === "Company" &&
        companyNames.has(normalizeName(String(row.normalizedData.name)))) ||
      (row.targetModel === "Contact" &&
        row.normalizedData.email &&
        contactEmails.has(String(row.normalizedData.email).toLowerCase())) ||
      (row.targetModel === "Opportunity" &&
        opportunityNames.has(normalizeName(String(row.normalizedData.name))));

    const issues = [...row.issues];

    if (duplicate) {
      issues.push("Posible duplicado: se omitira al confirmar.");
    }

    const companyName = row.normalizedData.companyName
      ? normalizeName(String(row.normalizedData.companyName))
      : null;
    if (
      companyName &&
      !companyNames.has(companyName) &&
      !incomingCompanyNames.has(companyName)
    ) {
      issues.push("Empresa relacionada no encontrada; se importara sin empresa.");
    }

    if (row.targetModel === "Opportunity") {
      const contactName = row.normalizedData.contactName
        ? normalizeName(String(row.normalizedData.contactName))
        : null;
      const serviceName = row.normalizedData.serviceName
        ? normalizeName(String(row.normalizedData.serviceName))
        : null;

      if (
        contactName &&
        !existingContactNames.has(contactName) &&
        !incomingContactNames.has(contactName)
      ) {
        issues.push(
          "Contacto relacionado no encontrado; se importara sin contacto.",
        );
      }
      if (serviceName && !serviceNames.has(serviceName)) {
        issues.push("Servicio no encontrado; se importara sin servicio.");
      }
    }

    return issues.length > 0
      ? { ...row, status: ImportRowStatus.WARNING, issues }
      : row;
  });
}

export async function uploadImportBatch(formData: FormData) {
  const user = await requireAdmin("Solo un administrador puede ejecutar importaciones.");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona un archivo Excel.");
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("El archivo debe tener extension .xlsx.");
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("El archivo supera el limite de 5 MB.");
  }

  let parsed;
  try {
    parsed = await readExcelImport(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new Error("No fue posible leer el archivo Excel. Verifica que no este corrupto.");
  }

  if (parsed.rows.length === 0) {
    throw new Error(
      "No se encontraron filas en hojas Empresas, Contactos u Oportunidades.",
    );
  }

  const rows = await markDuplicates(parsed.rows);
  const summary = {
    ...summarizeImportRows(rows),
    ignoredSheets: parsed.ignoredSheets,
    truncated: parsed.truncated,
  };
  const importable = summary.valid + summary.warnings;
  const batch = await prisma.importBatch.create({
    data: {
      fileName: file.name,
      status:
        importable > 0 ? ImportBatchStatus.READY : ImportBatchStatus.FAILED,
      createdById: user.id,
      summary: json(summary),
      rows: {
        create: rows.map((row) => ({
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,
          targetModel: row.targetModel,
          status: row.status,
          rawData: json(row.rawData),
          normalizedData: row.normalizedData
            ? json(row.normalizedData)
            : Prisma.JsonNull,
          issues: json(row.issues),
        })),
      },
    },
  });

  redirect(`/import/${batch.id}`);
}

type ImportData = Record<string, unknown>;

function text(data: ImportData, key: string) {
  const value = data[key];
  return value == null || value === "" ? null : String(value);
}

function date(data: ImportData, key: string) {
  const value = text(data, key);
  return value ? new Date(value) : null;
}

export async function confirmImportBatch(batchId: string) {
  const user = await requireAdmin("Solo un administrador puede ejecutar importaciones.");
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, status: ImportBatchStatus.READY },
    include: {
      rows: {
        where: { status: { in: [ImportRowStatus.VALID, ImportRowStatus.WARNING] } },
        orderBy: [{ targetModel: "asc" }, { rowNumber: "asc" }],
      },
    },
  });

  if (!batch) {
    throw new Error("El lote no esta disponible para importar.");
  }

  const companyRows = batch.rows.filter((row) => row.targetModel === "Company");
  const contactRows = batch.rows.filter((row) => row.targetModel === "Contact");
  const opportunityRows = batch.rows.filter(
    (row) => row.targetModel === "Opportunity",
  );

  await prisma.$transaction(async (tx) => {
    const [companies, contacts, services] = await Promise.all([
      tx.company.findMany({ where: { deletedAt: null } }),
      tx.contact.findMany({ where: { deletedAt: null } }),
      tx.service.findMany({ where: { deletedAt: null, isActive: true } }),
    ]);
    const companyMap = new Map(
      companies.map((company) => [company.normalizedName, company]),
    );
    const contactEmailMap = new Map(
      contacts.flatMap((contact) =>
        contact.email ? [[contact.email.toLowerCase(), contact] as const] : [],
      ),
    );
    const contactNameMap = new Map(
      contacts.map((contact) => [normalizeName(contact.name), contact]),
    );
    const serviceMap = new Map(
      services.map((service) => [normalizeName(service.name), service]),
    );
    const opportunityNames = new Set(
      (
        await tx.opportunity.findMany({
          where: { deletedAt: null },
          select: { name: true },
        })
      ).map((opportunity) => normalizeName(opportunity.name)),
    );

    const rowOutcomes = new Map<
      string,
      { status: ImportRowStatus; entityId: string | null }
    >();

    // --- Companies: bulk-create the new ones in a single round trip ---
    const newCompanyRows: typeof companyRows = [];
    for (const row of companyRows) {
      const data = row.normalizedData as ImportData | null;
      if (!data) continue;
      const normalizedName = normalizeName(String(data.name));
      const existing = companyMap.get(normalizedName);
      if (existing) {
        rowOutcomes.set(row.id, {
          status: ImportRowStatus.SKIPPED,
          entityId: existing.id,
        });
      } else if (!newCompanyRows.some((r) => normalizeName(String((r.normalizedData as ImportData).name)) === normalizedName)) {
        newCompanyRows.push(row);
      } else {
        rowOutcomes.set(row.id, { status: ImportRowStatus.SKIPPED, entityId: null });
      }
    }

    if (newCompanyRows.length > 0) {
      const companyInputs = newCompanyRows.map((row) => {
        const data = row.normalizedData as ImportData;
        const input = {
          name: String(data.name),
          industry: text(data, "industry"),
          region: text(data, "region"),
          status: String(data.status) as never,
          size: text(data, "size"),
          responsibleId: null,
          notes: text(data, "notes"),
        };
        return {
          row,
          input,
          normalizedName: normalizeName(String(data.name)),
        };
      });

      const created = await tx.company.createManyAndReturn({
        data: companyInputs.map(({ input, normalizedName }) => ({
          ...input,
          normalizedName,
          completeness: calculateCompanyCompleteness(input),
        })),
      });

      created.forEach((company, index) => {
        const { row, normalizedName } = companyInputs[index];
        companyMap.set(normalizedName, company);
        rowOutcomes.set(row.id, {
          status: ImportRowStatus.IMPORTED,
          entityId: company.id,
        });
      });
    }

    // --- Contacts: bulk-create the new ones in a single round trip ---
    const newContactRows: typeof contactRows = [];
    const seenContactEmails = new Set<string>();
    for (const row of contactRows) {
      const data = row.normalizedData as ImportData | null;
      if (!data) continue;
      const email = text(data, "email")?.toLowerCase() ?? null;
      const existing = email ? contactEmailMap.get(email) : null;
      if (existing) {
        rowOutcomes.set(row.id, {
          status: ImportRowStatus.SKIPPED,
          entityId: existing.id,
        });
      } else if (email && seenContactEmails.has(email)) {
        rowOutcomes.set(row.id, { status: ImportRowStatus.SKIPPED, entityId: null });
      } else {
        if (email) seenContactEmails.add(email);
        newContactRows.push(row);
      }
    }

    if (newContactRows.length > 0) {
      const contactInputs = newContactRows.map((row) => {
        const data = row.normalizedData as ImportData;
        const companyName = text(data, "companyName");
        const company = companyName
          ? companyMap.get(normalizeName(companyName))
          : null;
        const email = text(data, "email")?.toLowerCase() ?? null;
        const input = {
          name: String(data.name),
          companyId: company?.id ?? null,
          roleArea: text(data, "roleArea"),
          status: String(data.status) as never,
          email,
          phone: text(data, "phone"),
          leadSource: text(data, "leadSource") as never,
          responsibleId: null,
          notes: text(data, "notes"),
        };
        return { row, input };
      });

      const created = await tx.contact.createManyAndReturn({
        data: contactInputs.map(({ input }) => ({
          ...input,
          completeness: calculateContactCompleteness(input),
        })),
      });

      created.forEach((contact, index) => {
        const { row } = contactInputs[index];
        if (contact.email) contactEmailMap.set(contact.email, contact);
        contactNameMap.set(normalizeName(contact.name), contact);
        rowOutcomes.set(row.id, {
          status: ImportRowStatus.IMPORTED,
          entityId: contact.id,
        });
      });
    }

    // --- Opportunities: bulk-create the new ones in a single round trip ---
    const newOpportunityRows: typeof opportunityRows = [];
    const seenOpportunityNames = new Set<string>();
    for (const row of opportunityRows) {
      const data = row.normalizedData as ImportData | null;
      if (!data) continue;
      const normalizedOpportunityName = normalizeName(String(data.name));
      if (
        opportunityNames.has(normalizedOpportunityName) ||
        seenOpportunityNames.has(normalizedOpportunityName)
      ) {
        rowOutcomes.set(row.id, { status: ImportRowStatus.SKIPPED, entityId: null });
      } else {
        seenOpportunityNames.add(normalizedOpportunityName);
        newOpportunityRows.push(row);
      }
    }

    if (newOpportunityRows.length > 0) {
      const opportunityInputs = newOpportunityRows.map((row) => {
        const data = row.normalizedData as ImportData;
        const companyName = text(data, "companyName");
        const contactName = text(data, "contactName");
        const serviceName = text(data, "serviceName");
        const company = companyName
          ? companyMap.get(normalizeName(companyName))
          : null;
        const contact = contactName
          ? contactNameMap.get(normalizeName(contactName))
          : null;
        const service = serviceName
          ? serviceMap.get(normalizeName(serviceName))
          : null;
        const amountInput = {
          price: Number(data.price),
          exchangeRate: Number(data.exchangeRate),
          quantity: Number(data.quantity),
          months: Number(data.months),
          probability: Number(data.probability),
        };
        const amounts = calculateOpportunityAmounts(amountInput);
        const input = {
          name: String(data.name),
          companyId: company?.id ?? null,
          primaryContactId: contact?.id ?? null,
          serviceId: service?.id ?? null,
          status: String(data.status) as never,
          certainty: text(data, "certainty") as never,
          probability: amountInput.probability,
          businessUnit: text(data, "businessUnit"),
          currency: String(data.currency) as never,
          price: amountInput.price,
          exchangeRate: amountInput.exchangeRate,
          quantity: amountInput.quantity,
          months: amountInput.months,
          estimatedCloseDate: text(data, "estimatedCloseDate"),
          estimatedStartDate: text(data, "estimatedStartDate"),
          nextActionDate: text(data, "nextActionDate"),
          responsibleId: null,
          notes: null,
        };
        return { row, input, amounts };
      });

      const created = await tx.opportunity.createManyAndReturn({
        data: opportunityInputs.map(({ input, amounts }) => ({
          ...input,
          estimatedCloseDate: date(input, "estimatedCloseDate"),
          estimatedStartDate: date(input, "estimatedStartDate"),
          nextActionDate: date(input, "nextActionDate"),
          priceClp: amounts.priceClp,
          monthlyAmount: amounts.monthlyAmount,
          totalAmount: amounts.totalAmount,
          weightedAmount: amounts.weightedAmount,
          completeness: calculateOpportunityCompleteness(input),
        })),
      });

      created.forEach((opportunity, index) => {
        const { row } = opportunityInputs[index];
        rowOutcomes.set(row.id, {
          status: ImportRowStatus.IMPORTED,
          entityId: opportunity.id,
        });
      });
    }

    // --- Persist all row outcomes in a single bulk UPDATE ---
    const outcomeEntries = [...rowOutcomes.entries()];
    if (outcomeEntries.length > 0) {
      const values = outcomeEntries
        .map(
          (_, index) =>
            `($${index * 3 + 1}::text, $${index * 3 + 2}::"ImportRowStatus", $${index * 3 + 3}::text)`,
        )
        .join(", ");
      const params = outcomeEntries.flatMap(([rowId, outcome]) => [
        rowId,
        outcome.status,
        outcome.entityId,
      ]);
      await tx.$executeRawUnsafe(
        `UPDATE "ImportRow" AS ir
         SET status = v.status, "createdEntityId" = v.entity_id
         FROM (VALUES ${values}) AS v(id, status, entity_id)
         WHERE ir.id = v.id`,
        ...params,
      );
    }

    await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportBatchStatus.IMPORTED,
        importedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        action: AuditAction.IMPORT,
        entityType: "ImportBatch",
        entityId: batch.id,
        actorId: user.id,
        after: { fileName: batch.fileName, rows: batch.rows.length },
      },
    });
  }, { timeout: 60_000 });

  revalidatePath("/import");
  revalidatePath(`/import/${batch.id}`);
  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/opportunities");
  redirect(`/import/${batch.id}`);
}

export async function cancelImportBatch(batchId: string) {
  await requireAdmin("Solo un administrador puede ejecutar importaciones.");
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: ImportBatchStatus.CANCELLED },
  });
  revalidatePath("/import");
  redirect("/import");
}
