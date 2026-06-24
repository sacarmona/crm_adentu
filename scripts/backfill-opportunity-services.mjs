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

async function main() {
  const services = await prisma.service.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const serviceMap = new Map(services.map((s) => [normalizeName(s.name), s.id]));

  const rows = await prisma.importRow.findMany({
    where: {
      targetModel: "Opportunity",
      status: "IMPORTED",
      createdEntityId: { not: null },
    },
    select: { createdEntityId: true, normalizedData: true },
  });

  let updated = 0;
  let skippedNoServiceName = 0;
  let skippedNoMatch = 0;
  let skippedAlreadySet = 0;

  for (const row of rows) {
    const serviceName = row.normalizedData?.serviceName;
    if (!serviceName) {
      skippedNoServiceName += 1;
      continue;
    }
    const serviceId = serviceMap.get(normalizeName(String(serviceName)));
    if (!serviceId) {
      skippedNoMatch += 1;
      continue;
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id: row.createdEntityId },
      select: { id: true, serviceId: true },
    });
    if (!opportunity || opportunity.serviceId) {
      skippedAlreadySet += 1;
      continue;
    }

    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: { serviceId },
    });
    updated += 1;
  }

  console.log({
    totalRows: rows.length,
    updated,
    skippedNoServiceName,
    skippedNoMatch,
    skippedAlreadySet,
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
