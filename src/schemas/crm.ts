import {
  Certainty,
  CompanyStatus,
  ContactStatus,
  Currency,
  InteractionType,
  LeadSource,
  OpportunityStatus,
  TaskStatus,
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

export const interactionSchema = z
  .object({
    date: z.string().min(1, "La fecha es obligatoria."),
    type: z.nativeEnum(InteractionType),
    content: z.string().trim().min(3, "Registra el contenido de la interaccion."),
    companyId: optionalText,
    contactId: optionalText,
    opportunityId: optionalText,
    serviceId: optionalText,
    nextAction: optionalText,
    nextActionDate: optionalText,
  })
  .refine(
    (data) => data.companyId || data.contactId || data.opportunityId,
    "La interaccion debe asociarse a una empresa, contacto u oportunidad.",
  );

export const taskSchema = z.object({
  title: z.string().trim().min(3, "El titulo es obligatorio."),
  description: optionalText,
  status: z.nativeEnum(TaskStatus),
  dueDate: optionalText,
  result: optionalText,
  companyId: optionalText,
  contactId: optionalText,
  opportunityId: optionalText,
  serviceId: optionalText,
  assignedToId: optionalText,
});

export const taskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.nativeEnum(TaskStatus),
  result: optionalText,
});

export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type OpportunityInput = z.infer<typeof opportunitySchema>;
export type InteractionInput = z.infer<typeof interactionSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
