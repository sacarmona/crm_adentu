import { z } from "zod";

export const commercialDocumentExtractionSchema = z.object({
  type: z.enum(["QUOTE", "PROPOSAL", "CONTRACT"]).nullable(),
  title: z.string().nullable(),
  documentNumber: z.string().nullable(),
  documentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  currency: z.enum(["CLP", "UF", "USD", "EUR"]).nullable(),
  amount: z.number().nonnegative().nullable(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  summary: z.string().nullable(),
});

export type CommercialDocumentExtraction = z.infer<
  typeof commercialDocumentExtractionSchema
>;

export function buildCommercialDocumentExtractionPrompt(text: string) {
  return [
    "Extrae datos de este documento comercial chileno.",
    "Usa null cuando un dato no aparezca de forma explicita. No calcules ni inventes valores.",
    "type: QUOTE para cotizacion, PROPOSAL para propuesta y CONTRACT para contrato.",
    "documentNumber: folio o numero de cotizacion, propuesta o contrato.",
    "documentDate y validUntil: formato YYYY-MM-DD.",
    "currency: CLP, UF, USD o EUR.",
    "amount: monto total neto comercial indicado; no incluyas separadores de miles.",
    "summary: una frase factual sobre el objeto del documento.",
    "Texto del documento:",
    text.slice(0, 50_000),
  ].join("\n");
}
