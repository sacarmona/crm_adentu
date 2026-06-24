import {
  AiInsightStatus,
  AiInsightType,
  AuditAction,
  Certainty,
  CommercialSentiment,
  CompanyStatus,
  ContactStatus,
  Currency,
  EmailClassificationStatus,
  EmailCommercialIntent,
  EmailDraftStatus,
  ImportBatchStatus,
  ImportRowStatus,
  InteractionType,
  LeadSource,
  OpportunityStatus,
  TaskStatus,
  UserRole,
} from "@prisma/client";

export const userRoleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  COMERCIAL: "Comercial",
  LECTURA: "Lectura",
};

export const companyStatusLabels: Record<CompanyStatus, string> = {
  UNQUALIFIED: "Sin calificar",
  PROSPECTING: "En prospeccion",
  HISTORIC_CLIENT: "Cliente historico",
  ACTIVE_CLIENT: "Cliente activo",
  LOST: "Perdido",
  DISCARDED: "Descartado",
};

export const contactStatusLabels: Record<ContactStatus, string> = {
  UNQUALIFIED: "No calificado",
  QUALIFIED_POSITIVE: "Calificado positivo",
  WITH_OPPORTUNITY: "Con oportunidad",
  CLIENT: "Cliente",
  LOST: "Perdido",
  QUALIFIED_NEGATIVE: "Calificado negativo",
};

export const opportunityStatusLabels: Record<OpportunityStatus, string> = {
  EXPLORATION: "Exploracion",
  PROPOSAL_SENT: "Propuesta enviada",
  NEGOTIATION: "Negociacion",
  WON: "Cerrada - Ganada",
  STALLED: "Estancada",
  LOST: "Cerrada - Perdida",
};

export const leadSourceLabels: Record<LeadSource, string> = {
  INBOUND_EMAIL: "Inbound - Correo",
  INBOUND_PHONE_WHATSAPP: "Inbound - Tel/Wsp",
  INBOUND_OTHER: "Inbound - Otro",
  OUTBOUND_CONSULTATIVE: "Outbound - Consultivo",
  OUTBOUND_RELATIONAL: "Outbound - Relacional",
  OUTBOUND_FAIRS: "Outbound - Ferias",
  OUTBOUND_OTHER: "Outbound - Otro",
};

export const certaintyLabels: Record<Certainty, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export const currencyLabels: Record<Currency, string> = {
  CLP: "CLP",
  UF: "UF",
  USD: "USD",
  EUR: "EUR",
};

export const interactionTypeLabels: Record<InteractionType, string> = {
  EMAIL: "Correo",
  WHATSAPP: "WhatsApp",
  PHONE: "Telefono",
  LINKEDIN: "LinkedIn",
  NEW_FOCUS_CLIENT_MEETING: "Reunion cliente foco nuevo",
  ONLINE_MEETING: "Reunion - Online",
  IN_PERSON_MEETING: "Reunion - Presencial",
  PROPOSAL_SENT: "Envio propuesta",
  FOLLOW_UP: "Seguimiento",
  CLIENT_RESPONSE: "Respuesta del cliente",
  OTHER: "Otras",
};

export const auditActionLabels: Record<AuditAction, string> = {
  CREATE: "Creacion",
  UPDATE: "Actualizacion",
  STAGE_CHANGE: "Cambio de etapa",
  SOFT_DELETE: "Eliminacion",
  IMPORT: "Importacion",
  AI_SUGGESTION_APPROVAL: "Aprobacion de sugerencia IA",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: "Pendiente",
  EXECUTED: "Ejecutada",
  CLOSED: "Cerrado",
};

export const aiInsightTypeLabels: Record<AiInsightType, string> = {
  INTERACTION_ANALYSIS: "Analisis de interaccion",
  NEXT_ACTION_SUGGESTION: "Sugerencia de proxima accion",
  FOLLOW_UP_EMAIL: "Correo de seguimiento",
  COMPANY_HISTORY_SUMMARY: "Resumen de historial de empresa",
  DORMANT_OPPORTUNITY_DETECTION: "Deteccion de oportunidad inactiva",
  INCOMPLETE_COMPANY_DETECTION: "Deteccion de empresa incompleta",
  CONTACT_WITHOUT_FOLLOW_UP_DETECTION: "Deteccion de contacto sin seguimiento",
};

export const aiInsightStatusLabels: Record<AiInsightStatus, string> = {
  DRAFT: "Borrador",
  PROPOSED: "Propuesto",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export const commercialSentimentLabels: Record<CommercialSentiment, string> = {
  POSITIVE: "Positivo",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negativo",
};

export const importBatchStatusLabels: Record<ImportBatchStatus, string> = {
  DRAFT: "Borrador",
  VALIDATING: "Validando",
  READY: "Listo",
  IMPORTED: "Importado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};

export const importRowStatusLabels: Record<ImportRowStatus, string> = {
  PENDING: "Pendiente",
  VALID: "Valido",
  WARNING: "Advertencia",
  ERROR: "Error",
  IMPORTED: "Importado",
  SKIPPED: "Omitido",
};

export const emailClassificationStatusLabels: Record<
  EmailClassificationStatus,
  string
> = {
  PROPOSED: "Propuesta",
  APPROVED: "Aprobada",
  IGNORED: "Ignorada",
};

export const emailCommercialIntentLabels: Record<EmailCommercialIntent, string> =
  {
    INQUIRY: "Consulta",
    OPPORTUNITY: "Oportunidad",
    FOLLOW_UP: "Seguimiento",
    PROPOSAL: "Propuesta",
    NEGOTIATION: "Negociacion",
    SUPPORT: "Soporte",
    ADMINISTRATIVE: "Administrativo",
    OTHER: "Otro",
  };

export const emailDraftStatusLabels: Record<EmailDraftStatus, string> = {
  DRAFT: "Borrador",
  APPROVED: "Aprobado",
  DISCARDED: "Descartado",
};
