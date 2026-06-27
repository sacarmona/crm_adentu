import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(DATABASE_URL),
});

const TARGET_PROBABILITY = { WON: 1, LOST: 0 };

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

try {
  let updated = 0;

  for (const status of ["WON", "LOST"]) {
    const targetProbability = TARGET_PROBABILITY[status];
    const opportunities = await prisma.opportunity.findMany({
      where: {
        status,
        deletedAt: null,
        probabilityBeforeClose: null,
        probability: { not: targetProbability },
      },
      select: { id: true, probability: true, totalAmount: true },
    });

    for (const opportunity of opportunities) {
      const weightedAmount = roundMoney(Number(opportunity.totalAmount) * targetProbability);
      await prisma.opportunity.update({
        where: { id: opportunity.id },
        data: {
          probabilityBeforeClose: opportunity.probability,
          probability: targetProbability,
          weightedAmount,
        },
      });
      updated += 1;
    }

    console.log(`${status}: ${opportunities.length} oportunidad(es) actualizadas.`);
  }

  console.log(`Total actualizado: ${updated}.`);
} finally {
  await prisma.$disconnect();
}
