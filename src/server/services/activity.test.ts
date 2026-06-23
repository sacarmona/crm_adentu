import { TaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  isOverdueTask,
  parseLocalDateTime,
  taskExecutionFields,
} from "./activity";

describe("commercial activity rules", () => {
  it("parses datetime-local values", () => {
    expect(parseLocalDateTime("2026-06-23T10:30")?.getTime()).not.toBeNaN();
    expect(parseLocalDateTime(null)).toBeNull();
  });

  it("sets execution date when a task is executed", () => {
    const now = new Date("2026-06-23T14:00:00Z");
    expect(
      taskExecutionFields(TaskStatus.EXECUTED, "Cliente contactado", now),
    ).toEqual({
      status: TaskStatus.EXECUTED,
      result: "Cliente contactado",
      executedAt: now,
    });
  });

  it("clears execution date when a task returns to pending", () => {
    expect(taskExecutionFields(TaskStatus.PENDING, null).executedAt).toBeNull();
  });

  it("only marks pending past-due tasks as overdue", () => {
    const now = new Date("2026-06-23T14:00:00Z");
    const dueDate = new Date("2026-06-22T14:00:00Z");

    expect(isOverdueTask({ status: TaskStatus.PENDING, dueDate, now })).toBe(true);
    expect(isOverdueTask({ status: TaskStatus.CLOSED, dueDate, now })).toBe(false);
  });
});
