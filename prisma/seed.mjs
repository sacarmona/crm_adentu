import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the seed.");
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
  ["lead_source", "OUTBOUND_CONSULTATIVE", "Outbound - Consultivo"],
  ["currency", "CLP", "CLP"],
  ["currency", "UF", "UF"],
  ["currency", "USD", "USD"],
  ["currency", "EUR", "EUR"],
];

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function calculateOpportunity({ price, exchangeRate, quantity, months, probability }) {
  const priceClp = price * exchangeRate;
  const monthlyAmount = priceClp * quantity;
  const totalAmount = monthlyAmount * months;
  const weightedAmount = totalAmount * probability;

  return {
    priceClp: priceClp.toFixed(2),
    monthlyAmount: monthlyAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    weightedAmount: weightedAmount.toFixed(2),
  };
}

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.importRow.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.aiInsight.deleteMany();
  await prisma.playbookItem.deleteMany();
  await prisma.playbook.deleteMany();
  await prisma.marketAsset.deleteMany();
  await prisma.commercialMilestone.deleteMany();
  await prisma.task.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.dictionaryValue.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetDatabase();

  const admin = await prisma.user.create({
    data: {
      name: "Admin ADENTU",
      email: "admin.demo@adentu.cl",
      role: "ADMIN",
    },
  });

  const commercial = await prisma.user.create({
    data: {
      name: "Ejecutiva Comercial Demo",
      email: "comercial.demo@adentu.cl",
      role: "COMERCIAL",
    },
  });

  const reader = await prisma.user.create({
    data: {
      name: "Lectura Demo",
      email: "lectura.demo@adentu.cl",
      role: "LECTURA",
    },
  });

  const serviceRecords = {};
  for (const [index, name] of services.entries()) {
    const service = await prisma.service.create({
      data: {
        name,
        slug: slugify(name),
        sortOrder: index + 1,
        description: `Servicio comercial demo: ${name}.`,
      },
    });
    serviceRecords[name] = service;
  }

  for (const [index, [type, key, label]] of dictionaryValues.entries()) {
    await prisma.dictionaryValue.create({
      data: {
        type,
        key,
        label,
        sortOrder: index + 1,
      },
    });
  }

  const energiaSur = await prisma.company.create({
    data: {
      name: "Energia Sur Demo SpA",
      normalizedName: "energia sur demo spa",
      industry: "Energia",
      region: "Biobio",
      status: "PROSPECTING",
      size: "Mediana",
      responsibleId: commercial.id,
      lastInteraction: new Date("2026-06-15T14:30:00-04:00"),
      activeDeals: 1,
      contactCount: 1,
      completeness: 86,
      notes: "Empresa ficticia usada para validar el flujo comercial.",
    },
  });

  const mineraNorte = await prisma.company.create({
    data: {
      name: "Minera Norte Demo Ltda",
      normalizedName: "minera norte demo ltda",
      industry: "Mineria",
      region: "Antofagasta",
      status: "ACTIVE_CLIENT",
      size: "Grande",
      responsibleId: commercial.id,
      lastInteraction: new Date("2026-06-18T10:00:00-04:00"),
      activeDeals: 1,
      totalWon: "18500000.00",
      contactCount: 1,
      completeness: 92,
      notes: "Cliente ficticio para probar oportunidades ganadas y pipeline activo.",
    },
  });

  const contactoEnergia = await prisma.contact.create({
    data: {
      name: "Carolina Fuentes Demo",
      companyId: energiaSur.id,
      roleArea: "Mantenimiento Predictivo",
      status: "WITH_OPPORTUNITY",
      email: "carolina.fuentes.demo@energiasur.example",
      phone: "+56911112222",
      leadSource: "OUTBOUND_CONSULTATIVE",
      responsibleId: commercial.id,
      lastInteraction: new Date("2026-06-15T14:30:00-04:00"),
      activeDeals: 1,
      completeness: 100,
      notes: "Contacto ficticio interesado en inspecciones termograficas.",
    },
  });

  const contactoMinera = await prisma.contact.create({
    data: {
      name: "Rodrigo Salinas Demo",
      companyId: mineraNorte.id,
      roleArea: "Operaciones",
      status: "CLIENT",
      email: "rodrigo.salinas.demo@mineranorte.example",
      phone: "+56933334444",
      leadSource: "INBOUND_EMAIL",
      responsibleId: commercial.id,
      lastInteraction: new Date("2026-06-18T10:00:00-04:00"),
      activeDeals: 1,
      completeness: 100,
      notes: "Contacto ficticio para oportunidad de inspeccion de lineas.",
    },
  });

  const termografiaAmounts = calculateOpportunity({
    price: 950000,
    exchangeRate: 1,
    quantity: 2,
    months: 3,
    probability: 0.55,
  });

  const oportunidadTermografia = await prisma.opportunity.create({
    data: {
      name: "Programa termografico subestaciones demo",
      primaryContactId: contactoEnergia.id,
      companyId: energiaSur.id,
      serviceId: serviceRecords.Termografia.id,
      status: "PROPOSAL_SENT",
      certainty: "MEDIUM",
      probability: "0.5500",
      ageDays: 18,
      businessUnit: "Inspecciones",
      currency: "CLP",
      price: "950000.00",
      exchangeRate: "1.000000",
      quantity: 2,
      months: 3,
      estimatedCloseDate: new Date("2026-07-20T12:00:00-04:00"),
      estimatedStartDate: new Date("2026-08-05T09:00:00-04:00"),
      nextActionDate: new Date("2026-06-25T09:00:00-04:00"),
      responsibleId: commercial.id,
      lastInteraction: new Date("2026-06-15T14:30:00-04:00"),
      completeness: 88,
      notes: "Oportunidad ficticia para validar calculos comerciales.",
      ...termografiaAmounts,
    },
  });

  const lineasAmounts = calculateOpportunity({
    price: 120,
    exchangeRate: 920,
    quantity: 50,
    months: 1,
    probability: 0.75,
  });

  const oportunidadLineas = await prisma.opportunity.create({
    data: {
      name: "Inspeccion lineas alta tension demo",
      primaryContactId: contactoMinera.id,
      companyId: mineraNorte.id,
      serviceId: serviceRecords["Inspeccion Lineas"].id,
      status: "NEGOTIATION",
      certainty: "HIGH",
      probability: "0.7500",
      ageDays: 31,
      businessUnit: "Inspecciones",
      currency: "USD",
      price: "120.00",
      exchangeRate: "920.000000",
      quantity: 50,
      months: 1,
      estimatedCloseDate: new Date("2026-07-05T12:00:00-04:00"),
      estimatedStartDate: new Date("2026-07-18T09:00:00-04:00"),
      nextActionDate: new Date("2026-06-24T11:00:00-04:00"),
      responsibleId: commercial.id,
      lastInteraction: new Date("2026-06-18T10:00:00-04:00"),
      completeness: 94,
      notes: "Oportunidad ficticia con moneda USD.",
      ...lineasAmounts,
    },
  });

  const interaction = await prisma.interaction.create({
    data: {
      date: new Date("2026-06-15T14:30:00-04:00"),
      contactId: contactoEnergia.id,
      companyId: energiaSur.id,
      opportunityId: oportunidadTermografia.id,
      executedById: commercial.id,
      type: "ONLINE_MEETING",
      content:
        "Reunion demo: cliente solicita propuesta para termografia en dos subestaciones.",
      nextAction: "Enviar propuesta tecnica y economica actualizada.",
      nextActionDate: new Date("2026-06-25T09:00:00-04:00"),
      nextActionDueDate: new Date("2026-06-25T18:00:00-04:00"),
      nextActionStatus: "PENDING",
      serviceId: serviceRecords.Termografia.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Enviar propuesta termografica demo",
      description: "Tarea creada como ejemplo desde una proxima accion.",
      status: "PENDING",
      dueDate: new Date("2026-06-25T18:00:00-04:00"),
      companyId: energiaSur.id,
      contactId: contactoEnergia.id,
      opportunityId: oportunidadTermografia.id,
      interactionId: interaction.id,
      serviceId: serviceRecords.Termografia.id,
      assignedToId: commercial.id,
      createdById: commercial.id,
    },
  });

  await prisma.marketAsset.create({
    data: {
      ownerName: "Energia Sur Demo SpA",
      unitName: "Subestacion Demo Los Robles",
      serviceId: serviceRecords.Termografia.id,
      quantity: 2,
      constructionCompany: "Constructora Demo Austral",
      operationMaintenance: "O&M Demo Energia",
      comment: "Activo ficticio para sugerir oportunidad desde mercado.",
      ownerCompanyId: energiaSur.id,
    },
  });

  await prisma.commercialMilestone.create({
    data: {
      date: new Date("2026-06-10T12:00:00-04:00"),
      companyId: mineraNorte.id,
      project: "Expansion planta demo norte",
      industry: "Mineria",
      ownerId: commercial.id,
    },
  });

  const playbook = await prisma.playbook.create({
    data: {
      name: "Playbook Termografia Demo",
      serviceId: serviceRecords.Termografia.id,
      description: "Guia ficticia para calificar oportunidades de termografia.",
      createdById: admin.id,
      items: {
        create: [
          {
            type: "KEY_QUESTION",
            title: "Alcance tecnico",
            content: "Confirmar cantidad de activos, criticidad y ventanas de inspeccion.",
            sortOrder: 1,
          },
          {
            type: "COMMON_OBJECTION",
            title: "Disponibilidad operacional",
            content: "Anticipar restricciones de acceso y coordinacion con mantenimiento.",
            sortOrder: 2,
          },
          {
            type: "PROPOSAL_CHECKLIST",
            title: "Checklist propuesta",
            content: "Incluir alcance, entregables, plazos, seguridad y supuestos.",
            sortOrder: 3,
          },
        ],
      },
    },
  });

  await prisma.aiInsight.create({
    data: {
      type: "INTERACTION_ANALYSIS",
      status: "PROPOSED",
      interactionId: interaction.id,
      companyId: energiaSur.id,
      contactId: contactoEnergia.id,
      opportunityId: oportunidadTermografia.id,
      summary: "Cliente muestra interes en termografia y requiere propuesta actualizada.",
      customerInterests: ["termografia", "subestaciones"],
      objections: ["coordinar ventanas operacionales"],
      commitments: ["ADENTU enviara propuesta"],
      risks: ["decision puede atrasarse por disponibilidad de operaciones"],
      suggestedNextSteps: ["enviar propuesta", "agendar seguimiento"],
      mentionedServices: ["Termografia"],
      sentiment: "POSITIVE",
      suggestedAdvanceProbability: "0.6500",
      suggestedChanges: {
        probability: 0.65,
        nextAction: "Agendar seguimiento posterior al envio de propuesta.",
      },
    },
  });

  await prisma.importBatch.create({
    data: {
      fileName: "CRM Adentu v2.0 demo.xlsx",
      status: "READY",
      createdById: admin.id,
      summary: {
        companies: 2,
        contacts: 2,
        opportunities: 2,
        warnings: 0,
      },
      rows: {
        create: [
          {
            sheetName: "EMPR",
            rowNumber: 2,
            targetModel: "Company",
            status: "VALID",
            rawData: { Nombre: "Energia Sur Demo SpA" },
            normalizedData: { name: "Energia Sur Demo SpA" },
          },
        ],
      },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        action: "CREATE",
        entityType: "Company",
        entityId: energiaSur.id,
        actorId: admin.id,
        after: { name: energiaSur.name },
      },
      {
        action: "CREATE",
        entityType: "Opportunity",
        entityId: oportunidadTermografia.id,
        actorId: commercial.id,
        after: { name: oportunidadTermografia.name },
      },
      {
        action: "CREATE",
        entityType: "Opportunity",
        entityId: oportunidadLineas.id,
        actorId: commercial.id,
        after: { name: oportunidadLineas.name },
      },
      {
        action: "CREATE",
        entityType: "Playbook",
        entityId: playbook.id,
        actorId: admin.id,
        after: { name: playbook.name },
      },
    ],
  });

  console.log("Seed completed with demo users:", {
    admin: admin.email,
    commercial: commercial.email,
    reader: reader.email,
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
