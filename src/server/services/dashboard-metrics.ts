import { OpportunityStatus, TaskStatus } from "@prisma/client";

const closedStatuses = new Set<OpportunityStatus>([
  OpportunityStatus.WON,
  OpportunityStatus.LOST,
]);

export type DashboardOpportunity = {
  status: OpportunityStatus;
  totalAmount: number;
  weightedAmount: number;
  lastInteraction: Date | null;
  createdAt: Date;
};

export type DashboardTask = {
  status: TaskStatus;
  dueDate: Date | null;
};

export function calculateDashboardMetrics(input: {
  opportunities: DashboardOpportunity[];
  tasks: DashboardTask[];
  now?: Date;
  dormantDays?: number;
}) {
  const now = input.now ?? new Date();
  const dormantDays = input.dormantDays ?? 14;
  const dormantBoundary = new Date(
    now.getTime() - dormantDays * 24 * 60 * 60 * 1000,
  );
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const openOpportunities = input.opportunities.filter(
    (opportunity) => !closedStatuses.has(opportunity.status),
  );
  const wonOpportunities = input.opportunities.filter(
    (opportunity) => opportunity.status === OpportunityStatus.WON,
  );
  const pendingTasks = input.tasks.filter(
    (task) => task.status === TaskStatus.PENDING,
  );

  return {
    openCount: openOpportunities.length,
    openAmount: openOpportunities.reduce(
      (sum, opportunity) => sum + opportunity.totalAmount,
      0,
    ),
    weightedAmount: openOpportunities.reduce(
      (sum, opportunity) => sum + opportunity.weightedAmount,
      0,
    ),
    wonAmount: wonOpportunities.reduce(
      (sum, opportunity) => sum + opportunity.totalAmount,
      0,
    ),
    overdueTasks: pendingTasks.filter(
      (task) => task.dueDate && task.dueDate < now,
    ).length,
    upcomingTasks: pendingTasks.filter(
      (task) =>
        task.dueDate && task.dueDate >= now && task.dueDate <= nextWeek,
    ).length,
    dormantOpportunities: openOpportunities.filter(
      (opportunity) =>
        (opportunity.lastInteraction ?? opportunity.createdAt) <
        dormantBoundary,
    ).length,
  };
}

export function daysSince(value: Date, now = new Date()) {
  return Math.max(
    0,
    Math.floor((now.getTime() - value.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

// Follow-up health tiers for open opportunities, based on days since the
// last interaction (or createdAt if there's none yet):
//   0-7 days    -> "normal", no action needed
//   8-59 days   -> "watch", same window as the Dashboard's 14-day warning
//   60+ days    -> "stalled", needs an explicit follow-up
export const FOLLOW_UP_NORMAL_DAYS = 7;
export const FOLLOW_UP_STALLED_DAYS = 60;

export type FollowUpHealth = "normal" | "watch" | "stalled" | "closed";

export function getFollowUpHealth(input: {
  status: OpportunityStatus;
  lastInteraction: Date | null;
  createdAt: Date;
  now?: Date;
}): { level: FollowUpHealth; days: number } {
  if (closedStatuses.has(input.status)) {
    return { level: "closed", days: 0 };
  }
  const days = daysSince(input.lastInteraction ?? input.createdAt, input.now);
  if (days > FOLLOW_UP_STALLED_DAYS) return { level: "stalled", days };
  if (days <= FOLLOW_UP_NORMAL_DAYS) return { level: "normal", days };
  return { level: "watch", days };
}
