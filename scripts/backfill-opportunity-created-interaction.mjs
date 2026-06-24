import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

async function main() {
  const opportunities = await prisma.opportunity.findMany({
    where: { deletedAt: null, interactions: { none: {} } },
    select: {
      id: true,
      companyId: true,
      primaryContactId: true,
      serviceId: true,
      createdAt: true,
    },
  });

  if (opportunities.length === 0) {
    console.log({ candidates: 0, interactionsCreated: 0, opportunitiesUpdated: 0 });
    return;
  }

  const created = await prisma.interaction.createMany({
    data: opportunities.map((opportunity) => ({
      date: opportunity.createdAt,
      type: "OTHER",
      content: "Oportunidad creada (fecha de ingreso al sistema)",
      companyId: opportunity.companyId,
      contactId: opportunity.primaryContactId,
      opportunityId: opportunity.id,
      serviceId: opportunity.serviceId,
    })),
  });

  const ids = opportunities.map((opportunity) => `'${opportunity.id}'`).join(",");
  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "Opportunity"
    SET "lastInteraction" = "createdAt"
    WHERE id IN (${ids}) AND "lastInteraction" IS NULL
  `);

  console.log({
    candidates: opportunities.length,
    interactionsCreated: created.count,
    opportunitiesUpdated: updated,
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
