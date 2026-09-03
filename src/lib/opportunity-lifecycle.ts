import { OpportunityClosurePhase, OpportunityStatus, Prisma } from "@prisma/client";

export const CLOSED_STATUSES = [OpportunityStatus.WON, OpportunityStatus.LOST];

export function isClosedStatus(status: OpportunityStatus): boolean {
  return status === OpportunityStatus.WON || status === OpportunityStatus.LOST;
}

/**
 * Fase de cierre resultante al cambiar de estado.
 * - Estado abierto -> null (no aplica).
 * - Estado cerrado recién alcanzado -> VIGENTE por defecto.
 * - Ya estaba cerrada (WON<->LOST) -> conserva la fase actual.
 */
export function nextClosurePhase(
  status: OpportunityStatus,
  current: OpportunityClosurePhase | null | undefined,
): OpportunityClosurePhase | null {
  if (!isClosedStatus(status)) return null;
  return current ?? OpportunityClosurePhase.VIGENTE;
}

/**
 * Filtro Prisma: excluye oportunidades finalizadas (deja abiertas y cerradas-vigentes).
 * Se usa un OR explícito porque en SQL `closurePhase <> 'FINALIZADA'` NO incluye las
 * filas con NULL (oportunidades abiertas), que sí deben verse.
 */
export const HIDE_FINALIZED: Prisma.OpportunityWhereInput = {
  OR: [
    { closurePhase: null },
    { closurePhase: { not: OpportunityClosurePhase.FINALIZADA } },
  ],
};
