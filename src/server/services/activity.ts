import { TaskStatus } from "@prisma/client";

export function parseLocalDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function taskExecutionFields(
  status: TaskStatus,
  result: string | null,
  now = new Date(),
) {
  return {
    status,
    result,
    executedAt: status === TaskStatus.PENDING ? null : now,
  };
}

export function isOverdueTask(input: {
  status: TaskStatus;
  dueDate: Date | null;
  now?: Date;
}) {
  return (
    input.status === TaskStatus.PENDING &&
    Boolean(input.dueDate && input.dueDate < (input.now ?? new Date()))
  );
}
