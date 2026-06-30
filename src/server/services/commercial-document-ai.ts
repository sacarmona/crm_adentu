import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { env } from "@/lib/env";
import { buildCommercialDocumentExtractionPrompt, CommercialDocumentExtraction, commercialDocumentExtractionSchema } from "@/server/services/commercial-document-analysis";

export async function extractCommercialDocument(documentText: string): Promise<CommercialDocumentExtraction> {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY no esta configurada.");
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await openai.responses.parse({
    model: env.OPENAI_MODEL,
    input: [
      { role: "system", content: "Extraes datos de documentos comerciales. No inventes informacion ausente." },
      { role: "user", content: buildCommercialDocumentExtractionPrompt(documentText) },
    ],
    text: { format: zodTextFormat(commercialDocumentExtractionSchema, "commercial_document_extraction") },
  });
  if (!response.output_parsed) throw new Error("La extraccion del documento no pudo validarse.");
  return response.output_parsed;
}
