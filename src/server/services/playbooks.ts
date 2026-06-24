import { PlaybookItemType } from "@prisma/client";

export const playbookItemLabels: Record<PlaybookItemType, string> = {
  KEY_QUESTION: "Preguntas clave",
  QUALIFICATION_CRITERIA: "Criterios de calificacion",
  COMMON_OBJECTION: "Objeciones frecuentes",
  SUGGESTED_NEXT_STEP: "Siguientes pasos",
  PROPOSAL_CHECKLIST: "Checklist de propuesta",
  SUGGESTED_DOCUMENT: "Documentos sugeridos",
};

export function groupPlaybookItems<T extends { type: PlaybookItemType }>(
  items: T[],
) {
  return Object.fromEntries(
    Object.values(PlaybookItemType).map((type) => [
      type,
      items.filter((item) => item.type === type),
    ]),
  ) as Record<PlaybookItemType, T[]>;
}
