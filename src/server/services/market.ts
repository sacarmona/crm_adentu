export function buildMarketOpportunityName(input: {
  unitName: string;
  serviceName?: string | null;
}) {
  return `${input.serviceName ?? "Servicio"} - ${input.unitName}`;
}

export function marketAssetCoverage(input: {
  ownerCompanyId?: string | null;
  constructionCompanyId?: string | null;
  omCompanyId?: string | null;
}) {
  return [
    input.ownerCompanyId,
    input.constructionCompanyId,
    input.omCompanyId,
  ].filter(Boolean).length;
}
