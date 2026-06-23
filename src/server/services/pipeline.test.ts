import { OpportunityStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { pipelineStages, summarizePipeline } from "./pipeline";

describe("pipeline", () => {
  it("keeps every commercial stage in its defined order", () => {
    expect(pipelineStages).toEqual([
      "EXPLORATION",
      "PROPOSAL_SENT",
      "NEGOTIATION",
      "WON",
      "STALLED",
      "LOST",
    ]);
  });

  it("summarizes count, total and weighted amount per stage", () => {
    const summary = summarizePipeline([
      {
        status: OpportunityStatus.EXPLORATION,
        totalAmount: 100,
        weightedAmount: 20,
      },
      {
        status: OpportunityStatus.EXPLORATION,
        totalAmount: 300,
        weightedAmount: 150,
      },
      {
        status: OpportunityStatus.WON,
        totalAmount: 500,
        weightedAmount: 500,
      },
    ]);

    expect(summary.EXPLORATION).toEqual({
      count: 2,
      totalAmount: 400,
      weightedAmount: 170,
    });
    expect(summary.WON).toEqual({
      count: 1,
      totalAmount: 500,
      weightedAmount: 500,
    });
    expect(summary.NEGOTIATION).toEqual({
      count: 0,
      totalAmount: 0,
      weightedAmount: 0,
    });
  });
});
