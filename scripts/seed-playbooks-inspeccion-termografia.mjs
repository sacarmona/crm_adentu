import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(DATABASE_URL),
});

const playbooks = [
  {
    name: "Inspeccion de Lineas Electricas",
    serviceMatch: ["inspecci", "linea"],
    description:
      "Guia comercial para calificar y proponer servicios de inspeccion de lineas electricas con drone.",
    items: [
      {
        type: "KEY_QUESTION",
        title: "Tipo y extension de la linea",
        content:
          "Que tipo de lineas necesita inspeccionar (alta/media/baja tension, longitud aproximada en km)?",
      },
      {
        type: "KEY_QUESTION",
        title: "Motivo de la inspeccion",
        content:
          "La inspeccion es periodica/normativa o reactiva (post-falla, post-evento climatico)?",
      },
      {
        type: "KEY_QUESTION",
        title: "Linea base previa",
        content:
          "Tiene inspecciones previas o lineas base (LiDAR, fotos termicas) para comparar?",
      },
      {
        type: "KEY_QUESTION",
        title: "Mandante final",
        content:
          "Quien es el mandante final (empresa electrica, generadora, cliente industrial con linea propia)?",
      },
      {
        type: "KEY_QUESTION",
        title: "Restricciones de acceso",
        content:
          "Existen restricciones de acceso (zonas rurales, permisos de vuelo, terrenos privados)?",
      },
      {
        type: "KEY_QUESTION",
        title: "Plazo de entrega",
        content:
          "Cual es el plazo exigido por normativa o por el cliente para entregar el informe?",
      },
      {
        type: "QUALIFICATION_CRITERIA",
        title: "Presupuesto asignado",
        content: "Tiene presupuesto/CAPEX-OPEX asignado para mantenimiento de lineas.",
      },
      {
        type: "QUALIFICATION_CRITERIA",
        title: "Permisos DGAC",
        content:
          "Cuenta con o requiere autorizacion DGAC para vuelos UAV en la zona.",
      },
      {
        type: "QUALIFICATION_CRITERIA",
        title: "Volumen del servicio",
        content:
          "El volumen (km de linea) justifica un servicio recurrente, no solo puntual.",
      },
      {
        type: "QUALIFICATION_CRITERIA",
        title: "Urgencia regulatoria",
        content:
          "Hay urgencia regulatoria (ej. exigencia SEC) o de continuidad de servicio.",
      },
      {
        type: "COMMON_OBJECTION",
        title: "Ya tiene proveedor de drone",
        content:
          "Diferenciar por calidad de informe, tiempos de respuesta y deteccion de severidad (no solo imagenes).",
      },
      {
        type: "COMMON_OBJECTION",
        title: "Costo vs inspeccion visual",
        content:
          "Argumentar reduccion de riesgo laboral, cobertura en zonas de dificil acceso y deteccion temprana de fallas.",
      },
      {
        type: "COMMON_OBJECTION",
        title: "No tiene permisos de vuelo",
        content: "Ofrecer gestion de permisos DGAC como parte del servicio.",
      },
      {
        type: "SUGGESTED_NEXT_STEP",
        title: "Levantamiento de informacion",
        content:
          "Solicitar kml/shapefile del trazado, numero de torres/postes y tension.",
      },
      {
        type: "SUGGESTED_NEXT_STEP",
        title: "Visita o reconocimiento remoto",
        content: "Definir alcance y cotizar a partir de la visita tecnica o reconocimiento remoto.",
      },
      {
        type: "SUGGESTED_NEXT_STEP",
        title: "Propuesta tecnica-economica",
        content: "Enviar propuesta con cronograma de vuelos.",
      },
      {
        type: "SUGGESTED_NEXT_STEP",
        title: "Piloto acotado",
        content: "Ofrecer un piloto en un tramo acotado antes de comprometer la linea completa.",
      },
      {
        type: "PROPOSAL_CHECKLIST",
        title: "Alcance",
        content: "Km, numero de estructuras, tipo de inspeccion: visual, termica, LiDAR.",
      },
      {
        type: "PROPOSAL_CHECKLIST",
        title: "Cronograma",
        content: "Ventanas de vuelo (clima, restricciones DGAC).",
      },
      {
        type: "PROPOSAL_CHECKLIST",
        title: "Entregables",
        content:
          "Informe de hallazgos, geolocalizacion, severidad, recomendaciones.",
      },
      {
        type: "PROPOSAL_CHECKLIST",
        title: "Condiciones comerciales",
        content: "Forma de pago y condiciones comerciales.",
      },
      {
        type: "SUGGESTED_DOCUMENT",
        title: "Ficha tecnica",
        content: "Ficha tecnica del servicio de inspeccion con drone.",
      },
      {
        type: "SUGGESTED_DOCUMENT",
        title: "Informe de ejemplo",
        content: "Ejemplo de informe de hallazgos (anonimizado).",
      },
      {
        type: "SUGGESTED_DOCUMENT",
        title: "Certificaciones DGAC",
        content: "Certificaciones/autorizaciones DGAC de ADENTU.",
      },
    ],
  },
  {
    name: "Termografia en Parques Solares",
    serviceMatch: ["termograf"],
    description:
      "Guia comercial para calificar y proponer servicios de termografia en plantas solares.",
    items: [
      {
        type: "KEY_QUESTION",
        title: "Tamano del parque",
        content: "Cual es la potencia instalada del parque (MW) y cantidad de paneles/strings?",
      },
      {
        type: "KEY_QUESTION",
        title: "Antecedente que motiva la inspeccion",
        content:
          "Ha tenido caidas de generacion o alertas del SCADA que motiven la inspeccion?",
      },
      {
        type: "KEY_QUESTION",
        title: "Tipo de servicio",
        content: "Busca un chequeo unico o un programa de mantenimiento predictivo periodico?",
      },
      {
        type: "KEY_QUESTION",
        title: "Operador del parque",
        content: "Quien opera el parque (EPC, O&M propio, dueno del activo)?",
      },
      {
        type: "KEY_QUESTION",
        title: "Garantias vigentes",
        content:
          "Tiene garantia vigente de paneles/inversores que dependa de evidencia de fallas?",
      },
      {
        type: "KEY_QUESTION",
        title: "Accesibilidad para drone",
        content:
          "Existe acceso para drone (restricciones aeroportuarias, terrenos colindantes)?",
      },
      {
        type: "QUALIFICATION_CRITERIA",
        title: "Tamano suficiente",
        content:
          "El parque tiene tamano suficiente (MW) para justificar costo de inspeccion aerea vs. manual.",
      },
      {
        type: "QUALIFICATION_CRITERIA",
        title: "Evento que dispara la necesidad",
        content:
          "Hay un evento concreto (baja de generacion, reclamo de garantia) que dispara la necesidad.",
      },
      {
        type: "QUALIFICATION_CRITERIA",
        title: "Capacidad de remediar",
        content:
          "El cliente tiene capacidad de implementar las correcciones que arroje el informe (no solo diagnostico).",
      },
      {
        type: "QUALIFICATION_CRITERIA",
        title: "Ventana climatica",
        content:
          "Disponibilidad de ventana de generacion/clima adecuada para termografia (evitar nubosidad/lluvia).",
      },
      {
        type: "COMMON_OBJECTION",
        title: "Ya tiene inspeccion visual del O&M",
        content:
          "Termografia detecta hot-spots y fallas no visibles a ojo, antes de que se conviertan en perdida de generacion o incendio.",
      },
      {
        type: "COMMON_OBJECTION",
        title: "Prefiere esperar la mantencion programada",
        content:
          "Cuantificar perdida de generacion estimada mientras la falla no se detecta.",
      },
      {
        type: "COMMON_OBJECTION",
        title: "Costo por MW parece alto",
        content:
          "Comparar contra el costo de un string fuera de servicio durante meses.",
      },
      {
        type: "SUGGESTED_NEXT_STEP",
        title: "Solicitar datos del parque",
        content:
          "Layout, potencia, fecha de puesta en marcha, ultimo mantenimiento.",
      },
      {
        type: "SUGGESTED_NEXT_STEP",
        title: "Coordinar ventana de vuelo",
        content:
          "Segun radiacion e irradiancia minima requerida para termografia valida.",
      },
      {
        type: "SUGGESTED_NEXT_STEP",
        title: "Propuesta tecnica-economica",
        content:
          "Incluir metricas a entregar (numero de hot-spots, % de paneles afectados, criticidad).",
      },
      {
        type: "SUGGESTED_NEXT_STEP",
        title: "Reporte preliminar + informe final",
        content: "Reporte preliminar in-situ y luego informe final con recomendaciones de O&M.",
      },
      {
        type: "PROPOSAL_CHECKLIST",
        title: "Alcance",
        content:
          "MW cubiertos, numero de inversores/strings, inspeccion termica + visual RGB.",
      },
      {
        type: "PROPOSAL_CHECKLIST",
        title: "Condiciones tecnicas",
        content: "Irradiancia minima requerida, horario de vuelo.",
      },
      {
        type: "PROPOSAL_CHECKLIST",
        title: "Entregables",
        content:
          "Mapa termico georreferenciado, ranking de severidad, recomendaciones.",
      },
      {
        type: "PROPOSAL_CHECKLIST",
        title: "Condiciones comerciales",
        content: "Forma de pago y condiciones comerciales.",
      },
      {
        type: "SUGGESTED_DOCUMENT",
        title: "Ficha tecnica",
        content: "Ficha tecnica del servicio de termografia en plantas solares.",
      },
      {
        type: "SUGGESTED_DOCUMENT",
        title: "Mapa termico de ejemplo",
        content: "Ejemplo de mapa termico / informe de hallazgos.",
      },
      {
        type: "SUGGESTED_DOCUMENT",
        title: "Normativa de referencia",
        content: "Normativa de referencia aplicada (ej. ASTM E2446 o similar si ADENTU la usa).",
      },
    ],
  },
];

try {
  for (const playbook of playbooks) {
    const services = await prisma.service.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    const matchedService = services.find((service) =>
      playbook.serviceMatch.some((needle) =>
        service.name.toLowerCase().includes(needle),
      ),
    );

    const existing = await prisma.playbook.findFirst({
      where: { name: playbook.name, deletedAt: null },
    });

    const record = existing
      ? await prisma.playbook.update({
          where: { id: existing.id },
          data: {
            description: playbook.description,
            serviceId: matchedService?.id ?? existing.serviceId,
          },
        })
      : await prisma.playbook.create({
          data: {
            name: playbook.name,
            description: playbook.description,
            serviceId: matchedService?.id,
          },
        });

    await prisma.playbookItem.deleteMany({ where: { playbookId: record.id } });
    await prisma.playbookItem.createMany({
      data: playbook.items.map((item, index) => ({
        playbookId: record.id,
        type: item.type,
        title: item.title,
        content: item.content,
        sortOrder: index,
      })),
    });

    console.log(
      `Playbook listo: ${record.name} (${playbook.items.length} items, servicio: ${matchedService?.name ?? "sin vincular"})`,
    );
  }
} finally {
  await prisma.$disconnect();
}
