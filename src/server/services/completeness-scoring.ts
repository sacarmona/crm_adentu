type ScoreRule<T> = {
  weight: number;
  isComplete: (input: T) => boolean;
};

function hasValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
}

function calculateScore<T>(input: T, rules: ScoreRule<T>[]) {
  return rules.reduce(
    (score, rule) => score + (rule.isComplete(input) ? rule.weight : 0),
    0,
  );
}

export type CompanyCompletenessInput = {
  name?: string | null;
  industry?: string | null;
  region?: string | null;
  status?: unknown;
  size?: string | null;
  responsibleId?: string | null;
  notes?: string | null;
};

const companyRules: ScoreRule<CompanyCompletenessInput>[] = [
  { weight: 20, isComplete: (input) => hasValue(input.name) },
  { weight: 15, isComplete: (input) => hasValue(input.industry) },
  { weight: 10, isComplete: (input) => hasValue(input.region) },
  { weight: 10, isComplete: (input) => hasValue(input.status) },
  { weight: 10, isComplete: (input) => hasValue(input.size) },
  { weight: 20, isComplete: (input) => hasValue(input.responsibleId) },
  { weight: 15, isComplete: (input) => hasValue(input.notes) },
];

export function calculateCompanyCompleteness(input: CompanyCompletenessInput) {
  return calculateScore(input, companyRules);
}

export type ContactCompletenessInput = {
  name?: string | null;
  companyId?: string | null;
  roleArea?: string | null;
  status?: unknown;
  email?: string | null;
  phone?: string | null;
  leadSource?: unknown;
  responsibleId?: string | null;
};

const contactRules: ScoreRule<ContactCompletenessInput>[] = [
  { weight: 15, isComplete: (input) => hasValue(input.name) },
  { weight: 20, isComplete: (input) => hasValue(input.companyId) },
  { weight: 15, isComplete: (input) => hasValue(input.roleArea) },
  { weight: 10, isComplete: (input) => hasValue(input.status) },
  { weight: 15, isComplete: (input) => hasValue(input.email) },
  { weight: 10, isComplete: (input) => hasValue(input.phone) },
  { weight: 10, isComplete: (input) => hasValue(input.leadSource) },
  { weight: 5, isComplete: (input) => hasValue(input.responsibleId) },
];

export function calculateContactCompleteness(input: ContactCompletenessInput) {
  return calculateScore(input, contactRules);
}

export type OpportunityCompletenessInput = {
  name?: string | null;
  companyId?: string | null;
  primaryContactId?: string | null;
  serviceId?: string | null;
  status?: unknown;
  certainty?: unknown;
  probability?: number | null;
  businessUnit?: string | null;
  price?: number | null;
  estimatedCloseDate?: string | Date | null;
  nextActionDate?: string | Date | null;
};

const opportunityRules: ScoreRule<OpportunityCompletenessInput>[] = [
  { weight: 10, isComplete: (input) => hasValue(input.name) },
  { weight: 15, isComplete: (input) => hasValue(input.companyId) },
  { weight: 10, isComplete: (input) => hasValue(input.primaryContactId) },
  { weight: 15, isComplete: (input) => hasValue(input.serviceId) },
  { weight: 5, isComplete: (input) => hasValue(input.status) },
  { weight: 10, isComplete: (input) => hasValue(input.certainty) },
  {
    weight: 10,
    isComplete: (input) =>
      typeof input.probability === "number" && input.probability > 0,
  },
  { weight: 5, isComplete: (input) => hasValue(input.businessUnit) },
  {
    weight: 10,
    isComplete: (input) => typeof input.price === "number" && input.price > 0,
  },
  { weight: 5, isComplete: (input) => hasValue(input.estimatedCloseDate) },
  { weight: 5, isComplete: (input) => hasValue(input.nextActionDate) },
];

export function calculateOpportunityCompleteness(
  input: OpportunityCompletenessInput,
) {
  return calculateScore(input, opportunityRules);
}
