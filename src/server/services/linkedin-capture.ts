export function linkedinInteractionContent(input: {
  sourceUrl: string;
  personName?: string | null;
  organizationName?: string | null;
  content: string;
}) {
  return [
    "Captura asistida desde LinkedIn",
    `Fuente: ${input.sourceUrl}`,
    input.personName ? `Persona: ${input.personName}` : null,
    input.organizationName ? `Organizacion: ${input.organizationName}` : null,
    "",
    input.content.trim(),
  ]
    .filter((value): value is string => value !== null)
    .join("\n");
}
