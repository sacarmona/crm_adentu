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
