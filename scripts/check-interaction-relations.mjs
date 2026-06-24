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
  const total = await prisma.interaction.count({ where: { deletedAt: null } });

  const withOpportunity = await prisma.interaction.count({
    where: { deletedAt: null, opportunityId: { not: null } },
  });
  const withService = await prisma.interaction.count({
    where: { deletedAt: null, serviceId: { not: null } },
  });
  const withCompany = await prisma.interaction.count({
    where: { deletedAt: null, companyId: { not: null } },
  });
  const withContact = await prisma.interaction.count({
    where: { deletedAt: null, contactId: { not: null } },
  });

  const orphanOpportunityIds = await prisma.interaction.findMany({
    where: { deletedAt: null, opportunityId: { not: null } },
    select: { id: true, opportunityId: true },
  });
  const validOpportunityIds = new Set(
    (await prisma.opportunity.findMany({ select: { id: true } })).map(
      (o) => o.id,
    ),
  );
  const danglingOpportunity = orphanOpportunityIds.filter(
    (row) => !validOpportunityIds.has(row.opportunityId),
  );

  const serviceRows = await prisma.interaction.findMany({
    where: { deletedAt: null, serviceId: { not: null } },
    select: { id: true, serviceId: true },
  });
  const validServiceIds = new Set(
    (await prisma.service.findMany({ select: { id: true } })).map((s) => s.id),
  );
  const danglingService = serviceRows.filter(
    (row) => !validServiceIds.has(row.serviceId),
  );

  console.log({
    totalInteractions: total,
    withOpportunity,
    withService,
    withCompany,
    withContact,
    pctWithOpportunity: total ? Math.round((withOpportunity / total) * 100) : 0,
    pctWithService: total ? Math.round((withService / total) * 100) : 0,
    danglingOpportunityRefs: danglingOpportunity.length,
    danglingServiceRefs: danglingService.length,
    danglingOpportunitySample: danglingOpportunity.slice(0, 5),
    danglingServiceSample: danglingService.slice(0, 5),
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
