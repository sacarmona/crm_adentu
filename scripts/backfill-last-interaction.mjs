import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

async function backfill(table, relationColumn) {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "${table}" AS t
    SET "lastInteraction" = sub.max_date
    FROM (
      SELECT "${relationColumn}" AS id, MAX("date") AS max_date
      FROM "Interaction"
      WHERE "deletedAt" IS NULL AND "${relationColumn}" IS NOT NULL
      GROUP BY "${relationColumn}"
    ) AS sub
    WHERE t.id = sub.id
      AND (t."lastInteraction" IS NULL OR t."lastInteraction" < sub.max_date)
  `);
  return { updated: result };
}

async function main() {
  const companies = await backfill("Company", "companyId");
  const contacts = await backfill("Contact", "contactId");
  const opportunities = await backfill("Opportunity", "opportunityId");

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
