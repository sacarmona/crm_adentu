import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

const services = [
  "Termografia",
  "Inspeccion Lineas",
  "Batimetria",
  "TVM",
  "Multiespectral",
  "Otras inspecciones",
  "Antenas",
  "Avance de Obra",
  "Venta Equipos",
  "Asesoria DGAC",
  "Capacitacion",
];

const dictionaryValues = [
  ["company_status", "UNQUALIFIED", "0 - Sin calificar"],
  ["company_status", "PROSPECTING", "+1 - En prospeccion"],
  ["company_status", "HISTORIC_CLIENT", "+2 - Cliente historico"],
  ["company_status", "ACTIVE_CLIENT", "+3 - Cliente activo"],
  ["company_status", "LOST", "-1 - Perdido"],
  ["company_status", "DISCARDED", "-2 - Descartado"],
  ["contact_status", "UNQUALIFIED", "0 - No calificado"],
  ["contact_status", "QUALIFIED_POSITIVE", "+1 - Calificado positivo"],
  ["contact_status", "WITH_OPPORTUNITY", "+2 - Con oportunidad"],
  ["contact_status", "CLIENT", "+3 - Cliente"],
  ["contact_status", "LOST", "-1 - Perdido"],
  ["contact_status", "QUALIFIED_NEGATIVE", "-2 - Calificado negativo"],
  ["opportunity_status", "EXPLORATION", "+0 - Exploracion"],
  ["opportunity_status", "PROPOSAL_SENT", "+1 - Propuesta enviada"],
  ["opportunity_status", "NEGOTIATION", "+2 - Negociacion"],
  ["opportunity_status", "WON", "+3 - Cerrada - Ganada"],
  ["opportunity_status", "STALLED", "-1 - Estancada"],
  ["opportunity_status", "LOST", "-2 - Cerrada - Perdida"],
  ["lead_source", "INBOUND_EMAIL", "Inbound - Correo"],
  ["lead_source", "INBOUND_PHONE_WHATSAPP", "Inbound - Tel/Wsp"],
  ["lead_source", "INBOUND_OTHER", "Inbound - Otro"],
  ["lead_source", "OUTBOUND_CONSULTATIVE", "Outbound - Consultivo"],
  ["lead_source", "OUTBOUND_RELATIONAL", "Outbound - Relacional"],
  ["lead_source", "OUTBOUND_FAIRS", "Outbound - Ferias"],
  ["lead_source", "OUTBOUND_OTHER", "Outbound - Otro"],
  ["currency", "CLP", "CLP"],
  ["currency", "UF", "UF"],
  ["currency", "USD", "USD"],
  ["currency", "EUR", "EUR"],
];

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  let createdServices = 0;
  for (const [index, name] of services.entries()) {
    const result = await prisma.service.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug: slugify(name),
        sortOrder: index + 1,
        description: `Servicio comercial: ${name}.`,
      },
    });
    if (result) createdServices += 1;
  }

  let createdDictionaryValues = 0;
  for (const [index, [type, key, label]] of dictionaryValues.entries()) {
    const existing = await prisma.dictionaryValue.findFirst({
      where: { type, key },
    });
    if (existing) continue;
    await prisma.dictionaryValue.create({
      data: { type, key, label, sortOrder: index + 1 },
    });
    createdDictionaryValues += 1;
  }

  console.log(
    `Services upserted: ${services.length}. New dictionary values: ${createdDictionaryValues}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
