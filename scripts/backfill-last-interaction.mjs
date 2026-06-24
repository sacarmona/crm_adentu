import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

async function backfill(model, relationColumn) {
  const rows = await prisma.interaction.groupBy({
    by: [relationColumn],
    where: { deletedAt: null, [relationColumn]: { not: null } },
    _max: { date: true },
  });

  let updated = 0;
  for (const row of rows) {
    const id = row[relationColumn];
    const maxDate = row._max.date;
    if (!id || !maxDate) continue;

    const result = await model.updateMany({
      where: {
        id,
        OR: [{ lastInteraction: null }, { lastInteraction: { lt: maxDate } }],
      },
      data: { lastInteraction: maxDate },
    });
    updated += result.count;
  }
  return { candidates: rows.length, updated };
}

async function main() {
  const companies = await backfill(prisma.company, "companyId");
  const contacts = await backfill(prisma.contact, "contactId");
  const opportunities = await backfill(prisma.opportunity, "opportunityId");

  console.log({ companies, contacts, opportunities });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
