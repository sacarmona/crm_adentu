import { z } from "zod";

export const linkedInProfileExtractionSchema = z.object({
  personName: z.string().nullable(),
  organizationName: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  content: z.string().min(1),
});

export type LinkedInProfileExtraction = z.infer<
  typeof linkedInProfileExtractionSchema
>;

export async function extractPdfText(buffer: Buffer) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const document = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(document, { mergePages: true });
  return text.trim();
}

export function buildLinkedInProfileExtractionPrompt(profileText: string) {
  return [
    "Extrae datos de este PDF de perfil de LinkedIn exportado por el usuario.",
    "No inventes datos que no esten en el texto.",
    "personName: nombre completo de la persona del perfil.",
    "organizationName: empresa u organizacion actual mencionada (la mas reciente en Experiencia), o null si no hay.",
    "sourceUrl: la URL de LinkedIn que aparece en el texto (sección Contactar), o null si no aparece.",
    "content: resumen breve y factual del cargo actual y experiencia relevante, basado solo en el texto entregado.",
    "Texto del PDF:",
    profileText,
  ].join("\n");
}
