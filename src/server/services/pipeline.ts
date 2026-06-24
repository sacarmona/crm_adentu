import { OpportunityStatus } from "@prisma/client";

import { opportunityStatusLabels } from "../../lib/labels";

export const pipelineStages = [
  OpportunityStatus.EXPLORATION,
  OpportunityStatus.PROPOSAL_SENT,
  OpportunityStatus.NEGOTIATION,
  OpportunityStatus.WON,
  OpportunityStatus.STALLED,
  OpportunityStatus.LOST,
] as const;

export const pipelineStageLabels = opportunityStatusLabels;

export type PipelineAmountItem = {
  status: OpportunityStatus;
  totalAmount: number;
  weightedAmount: number;
};

export function summarizePipeline(items: PipelineAmountItem[]) {
  const initial = Object.fromEntries(
    pipelineStages.map((status) => [
      status,
      { count: 0, totalAmount: 0, weightedAmount: 0 },
    ]),
  ) as Record<
    OpportunityStatus,
    { count: number; totalAmount: number; weightedAmount: number }
  >;

  return items.reduce((summary, item) => {
    const stage = summary[item.status];
    stage.count += 1;
    stage.totalAmount += item.totalAmount;
    stage.weightedAmount += item.weightedAmount;
    return summary;
  }, initial);
}
