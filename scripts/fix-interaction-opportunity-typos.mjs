import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
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

// Identified by comparing the INTE sheet's free-text "Oportunidad" column
// against the OPOR sheet's opportunity names. These rows had a typo/extra
// word that prevented the importer's exact-name match (see chat history).
const corrections = [
  {
    date: new Date("2025-05-23T00:00:00.000Z"),
    content: "Quejas sobre caidas de drones ",
    company: "Los Ríos",
    targetOpportunity: "Piloto Televigilancia",
  },
  {
    date: new Date("2025-06-04T00:00:00.000Z"),
    content: "Entrega piloto",
    company: "TEN",
    targetOpportunity: "TEN - Inspección de Líneas",
  },
  {
    date: new Date("2025-06-30T00:00:00.000Z"),
    content:
      "Aún no han decidido, están a la espera de cotizacion de otra empresa (Seguramente Ecodrones) y de todas maneras estima que realizaran los trabajos a finales de Agosto o septiembre",
    company: "TEN",
    targetOpportunity: "TEN - Inspección de Líneas",
  },
  {
    date: new Date("2025-11-28T00:00:00.000Z"),
    content: "FUP",
    company: "Veltis",
    targetOpportunity: "Piloto - Inspección Correas Transportadoras Zaldivar",
  },
  {
    date: new Date("2025-12-02T00:00:00.000Z"),
    content: "FUP",
    company: "Veltis",
    targetOpportunity: "Piloto - Inspección Correas Transportadoras Zaldivar",
  },
  {
    date: new Date("2025-12-02T00:00:00.000Z"),
    content: "Reu de coordinación inicial",
    company: "Veltis",
    targetOpportunity: "Piloto - Inspección Correas Transportadoras Zaldivar",
  },
  // Both "Amanecer Solar termo" and "Amanecer Solar lineas" share the same
  // company/contact (Elera / Guillermo Loli); only the explicit mention of
  // "termografia" in the next-action note disambiguates these two rows.
  {
    date: new Date("2025-08-01T00:00:00.000Z"),
    content: "Envío propuesta",
    company: "Elera",
    targetOpportunity: "Amanecer Solar termo",
  },
  // No textual clue distinguished termo vs lineas for these two; assigned
  // to "Amanecer Solar termo" per explicit user instruction.
  {
    date: new Date("2025-11-03T00:00:00.000Z"),
    content: "FUP",
    company: "Amanecer Solar SpA",
    targetOpportunity: "Amanecer Solar termo",
  },
  {
    date: new Date("2025-12-03T00:00:00.000Z"),
    content: "15 de enero aprox deciden proveedor",
    company: "Elera",
    targetOpportunity: "Amanecer Solar termo",
  },
];

async function main() {
  const opportunities = await prisma.opportunity.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const opportunityMap = new Map(
    opportunities.map((o) => [normalizeName(o.name), o.id]),
  );

  const results = [];
  for (const fix of corrections) {
    const opportunityId = opportunityMap.get(normalizeName(fix.targetOpportunity));
    if (!opportunityId) {
      results.push({ ...fix, status: "skipped: opportunity not found" });
      continue;
    }

    // Matched on date + content only: the source "Empresa" label for these
    // rows doesn't always match an existing Company record exactly (e.g.
    // "Amanecer Solar SpA" vs the opportunity's linked "Elera"), so it's
    // kept here for documentation, not as a query filter.
    const updated = await prisma.interaction.updateMany({
      where: {
        date: fix.date,
        content: fix.content,
        opportunityId: null,
        deletedAt: null,
      },
      data: { opportunityId },
    });
    results.push({
      date: fix.date.toISOString().slice(0, 10),
      company: fix.company,
      targetOpportunity: fix.targetOpportunity,
      matched: updated.count,
    });
  }

  console.log(results);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
