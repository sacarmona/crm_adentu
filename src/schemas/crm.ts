import {
  Certainty,
  CompanyStatus,
  ContactStatus,
  Currency,
  LeadSource,
  OpportunityStatus,
} from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(z.string().email().nullable());

const optionalEnum = <T extends Record<string, string>>(enumLike: T) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.nativeEnum(enumLike).nullable());

export const companySchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio."),
  industry: optionalText,
  region: optionalText,
  status: z.nativeEnum(CompanyStatus),
  size: optionalText,
  responsibleId: optionalText,
  notes: optionalText,
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio."),
  companyId: optionalText,
  roleArea: optionalText,
  status: z.nativeEnum(ContactStatus),
  email: optionalEmail,
  phone: optionalText,
  leadSource: optionalEnum(LeadSource),
  responsibleId: optionalText,
  notes: optionalText,
});

export const opportunitySchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio."),
  companyId: optionalText,
  primaryContactId: optionalText,
  serviceId: optionalText,
  status: z.nativeEnum(OpportunityStatus),
  certainty: optionalEnum(Certainty),
  probability: z.coerce.number().min(0).max(1),
  businessUnit: optionalText,
  currency: z.nativeEnum(Currency),
  price: z.coerce.number().min(0),
  exchangeRate: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive(),
  months: z.coerce.number().int().positive(),
  estimatedCloseDate: optionalText,
  estimatedStartDate: optionalText,
  nextActionDate: optionalText,
  responsibleId: optionalText,
  notes: optionalText,
});

export const opportunityStageSchema = z.object({
  opportunityId: z.string().uuid(),
  status: z.nativeEnum(OpportunityStatus),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type OpportunityInput = z.infer<typeof opportunitySchema>;
