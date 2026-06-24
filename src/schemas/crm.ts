import {
  Certainty,
  CompanyStatus,
  ContactStatus,
  Currency,
  InteractionType,
  LeadSource,
  OpportunityStatus,
  PlaybookItemType,
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

export const marketAssetSchema = z.object({
  unitName: z.string().trim().min(2, "El nombre de la unidad es obligatorio."),
  ownerName: optionalText,
  serviceId: optionalText,
  quantity: z.coerce.number().int().positive(),
  constructionCompany: optionalText,
  operationMaintenance: optionalText,
  otherRole: optionalText,
  comment: optionalText,
  ownerCompanyId: optionalText,
  constructionCompanyId: optionalText,
  omCompanyId: optionalText,
});

export const commercialMilestoneSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria."),
  companyId: optionalText,
  project: z.string().trim().min(2, "El proyecto es obligatorio."),
  industry: optionalText,
  ownerId: optionalText,
});

export const marketOpportunitySchema = z.object({
  assetId: z.string().uuid(),
  name: z.string().trim().min(2),
  companyId: optionalText,
  serviceId: optionalText,
  responsibleId: optionalText,
  probability: z.coerce.number().min(0).max(1),
  price: z.coerce.number().min(0),
  exchangeRate: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive(),
  months: z.coerce.number().int().positive(),
  estimatedCloseDate: optionalText,
  notes: optionalText,
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio."),
  description: optionalText,
  sortOrder: z.coerce.number().int().min(0),
  isActive: z
    .string()
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export const dictionaryValueSchema = z.object({
  type: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9_]+$/, "Usa minusculas, numeros y guion bajo."),
  key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[A-Z0-9_]+$/, "Usa mayusculas, numeros y guion bajo."),
  label: z.string().trim().min(1, "La etiqueta es obligatoria."),
  description: optionalText,
  sortOrder: z.coerce.number().int().min(0),
  isActive: z
    .string()
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export const playbookSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio."),
  serviceId: optionalText,
  description: optionalText,
  isActive: z
    .string()
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export const playbookItemSchema = z.object({
  type: z.nativeEnum(PlaybookItemType),
  title: z.string().trim().min(2, "El titulo es obligatorio."),
  content: z.string().trim().min(2, "El contenido es obligatorio."),
  sortOrder: z.coerce.number().int().min(0),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type OpportunityInput = z.infer<typeof opportunitySchema>;
export type InteractionInput = z.infer<typeof interactionSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type MarketAssetInput = z.infer<typeof marketAssetSchema>;
export type CommercialMilestoneInput = z.infer<typeof commercialMilestoneSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type DictionaryValueInput = z.infer<typeof dictionaryValueSchema>;
export type PlaybookInput = z.infer<typeof playbookSchema>;
export type PlaybookItemInput = z.infer<typeof playbookItemSchema>;
