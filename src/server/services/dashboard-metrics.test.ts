import { OpportunityStatus, TaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  calculateDashboardMetrics,
  daysSince,
} from "./dashboard-metrics";

const now = new Date("2026-06-23T12:00:00Z");

describe("dashboard metrics", () => {
  it("summarizes open, weighted and won pipeline amounts", () => {
    const metrics = calculateDashboardMetrics({
      now,
      opportunities: [
        {
          status: OpportunityStatus.EXPLORATION,
          totalAmount: 1_000,
          weightedAmount: 300,
          lastInteraction: now,
          createdAt: now,
        },
        {
          status: OpportunityStatus.WON,
          totalAmount: 2_000,
          weightedAmount: 2_000,
          lastInteraction: now,
          createdAt: now,
        },
        {
          status: OpportunityStatus.LOST,
          totalAmount: 5_000,
          weightedAmount: 0,
          lastInteraction: now,
          createdAt: now,
        },
      ],
      tasks: [],
    });

    expect(metrics).toMatchObject({
      openCount: 1,
      openAmount: 1_000,
      weightedAmount: 300,
      wonAmount: 2_000,
    });
  });

  it("detects overdue, upcoming and dormant work", () => {
    const metrics = calculateDashboardMetrics({
      now,
      opportunities: [
        {
          status: OpportunityStatus.NEGOTIATION,
          totalAmount: 1,
          weightedAmount: 1,
          lastInteraction: new Date("2026-06-01T12:00:00Z"),
          createdAt: now,
        },
      ],
      tasks: [
        {
          status: TaskStatus.PENDING,
          dueDate: new Date("2026-06-22T12:00:00Z"),
        },
        {
          status: TaskStatus.PENDING,
          dueDate: new Date("2026-06-26T12:00:00Z"),
        },
        {
          status: TaskStatus.CLOSED,
          dueDate: new Date("2026-06-20T12:00:00Z"),
        },
      ],
    });

    expect(metrics).toMatchObject({
      overdueTasks: 1,
      upcomingTasks: 1,
      dormantOpportunities: 1,
    });
  });

  it("calculates elapsed whole days without negative values", () => {
    expect(daysSince(new Date("2026-06-20T12:00:00Z"), now)).toBe(3);
    expect(daysSince(new Date("2026-06-25T12:00:00Z"), now)).toBe(0);
  });
});
