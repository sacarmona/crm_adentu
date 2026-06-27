import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const { DATABASE_URL, RESPONSIBLE_NAME } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const targetName = RESPONSIBLE_NAME?.trim() || "Jose Pablo Mujica";

const prisma = new PrismaClient({
  adapter: new PrismaPg(DATABASE_URL),
});

try {
  const user = await prisma.user.findFirst({
    where: { name: { equals: targetName, mode: "insensitive" }, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new Error(`No se encontro un usuario activo con nombre "${targetName}".`);
  }

  const companiesWithoutResponsible = await prisma.company.findMany({
    where: { responsibleId: null, deletedAt: null },
    select: { id: true },
  });

  if (companiesWithoutResponsible.length === 0) {
    console.log("No hay empresas sin responsable. Nada que hacer.");
  } else {
    const companyIds = companiesWithoutResponsible.map((company) => company.id);

    const [companiesUpdated, opportunitiesUpdated] = await prisma.$transaction([
      prisma.company.updateMany({
        where: { id: { in: companyIds } },
        data: { responsibleId: user.id },
      }),
      prisma.opportunity.updateMany({
        where: { companyId: { in: companyIds }, responsibleId: null, deletedAt: null },
        data: { responsibleId: user.id },
      }),
      prisma.auditLog.createMany({
        data: companyIds.map((id) => ({
          action: "UPDATE",
          entityType: "Company",
          entityId: id,
          actorId: user.id,
          before: { responsibleId: null },
          after: { responsibleId: user.id },
        })),
      }),
    ]);

    console.log(
      `Responsable "${user.name}" asignado a ${companiesUpdated.count} empresa(s) y ${opportunitiesUpdated.count} oportunidad(es) sin responsable.`,
    );
  }
} finally {
  await prisma.$disconnect();
}
