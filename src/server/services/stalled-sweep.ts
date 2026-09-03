import { AuditAction, OpportunityClosurePhase, OpportunityStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveStatusChangeProbability } from "@/server/services/opportunity-calculations";

/** Días sin interacción tras los cuales una oportunidad ESTANCADA se cierra como PERDIDA + FINALIZADA. */
export const STALLED_AUTO_CLOSE_DAYS = 14;

const SWEEP_ENTITY_TYPE = "SystemJob";
const SWEEP_ENTITY_ID = "stalled-auto-close";

// El reloj almacenado en UTC se trata como hora local de Chile (UTC-4) en el resto del CRM.
const APP_TZ_OFFSET_MS = 4 * 60 * 60 * 1000;

function startOfAppDay(now: Date): Date {
  const local = new Date(now.getTime() - APP_TZ_OFFSET_MS);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(startLocal + APP_TZ_OFFSET_MS);
}

/**
 * Cierra como PERDIDA + FINALIZADA las oportunidades ESTANCADA cuya última interacción
 * (o creación, si no hubo) sea anterior a STALLED_AUTO_CLOSE_DAYS.
 *
 * Guard diario: solo corre una vez por día natural (zona horaria de la app). Registra un
 * audit log marcador por corrida, que sirve además de bandera para evitar repetir la barrida
 * en cada carga de vista. Pasar `force: true` omite el guard (para pruebas manuales).
 */
export async function finalizeStalledOpportunities(options?: {
  now?: Date;
  force?: boolean;
}): Promise<{ ran: boolean; closed: number }> {
  const now = options?.now ?? new Date();

  if (!options?.force) {
    const alreadyRan = await prisma.auditLog.findFirst({
      where: {
        entityType: SWEEP_ENTITY_TYPE,
        entityId: SWEEP_ENTITY_ID,
        createdAt: { gte: startOfAppDay(now) },
      },
      select: { id: true },
    });
    if (alreadyRan) return { ran: false, closed: 0 };
  }

  const boundary = new Date(now.getTime() - STALLED_AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      status: OpportunityStatus.STALLED,
      OR: [
        { lastInteraction: { lt: boundary } },
        { lastInteraction: null, createdAt: { lt: boundary } },
      ],
    },
    select: {
      id: true,
      name: true,
      status: true,
      probability: true,
      probabilityBeforeClose: true,
    },
  });

  let closed = 0;
  for (const opp of candidates) {
    const { probability, probabilityBeforeClose } = resolveStatusChangeProbability({
      previousStatus: opp.status,
      newStatus: OpportunityStatus.LOST,
      currentProbability: Number(opp.probability),
      probabilityBeforeClose:
        opp.probabilityBeforeClose != null ? Number(opp.probabilityBeforeClose) : null,
    });

    await prisma.$transaction([
      prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          status: OpportunityStatus.LOST,
          closurePhase: OpportunityClosurePhase.FINALIZADA,
          probability,
          probabilityBeforeClose,
          weightedAmount: 0,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: AuditAction.STAGE_CHANGE,
          entityType: "Opportunity",
          entityId: opp.id,
          before: { name: opp.name, status: OpportunityStatus.STALLED },
          after: {
            name: opp.name,
            status: OpportunityStatus.LOST,
            closurePhase: OpportunityClosurePhase.FINALIZADA,
          },
          metadata: { source: "stalled-auto-close", days: STALLED_AUTO_CLOSE_DAYS },
        },
      }),
    ]);
    closed += 1;
  }

  // Marcador/bandera de corrida diaria (aunque no se haya cerrado ninguna).
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: SWEEP_ENTITY_TYPE,
      entityId: SWEEP_ENTITY_ID,
      after: { closed, ranAt: now.toISOString() },
    },
  });

  return { ran: true, closed };
}
