import { TaskStatus } from "@prisma/client";

const TASKS_API_URL = "https://tasks.googleapis.com/tasks/v1";

export const GOOGLE_TASK_SCOPES = ["https://www.googleapis.com/auth/tasks.readonly"];

export function googleTasksScopesGranted(scope?: string | null) {
  const granted = new Set((scope ?? "").split(/\s+/).filter(Boolean));
  return GOOGLE_TASK_SCOPES.every((required) => granted.has(required));
}

type GoogleTaskList = {
  id?: string;
  title?: string;
};

type GoogleTask = {
  id?: string;
  title?: string;
  notes?: string;
  status?: "needsAction" | "completed";
  due?: string;
  completed?: string;
  updated?: string;
  deleted?: boolean;
  hidden?: boolean;
  webViewLink?: string;
};

export type ImportedGoogleTask = {
  taskListId: string;
  taskListTitle: string;
  taskId: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  dueDate?: Date;
  completedAt?: Date;
  updatedAt?: Date;
  webViewLink?: string;
};

async function tasksJson<T>(accessToken: string, path: string) {
  const response = await fetch(`${TASKS_API_URL}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Tasks rechazo la solicitud (${response.status}).`);
  }
  return (await response.json()) as T;
}

function dateOrUndefined(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dueDateOrUndefined(value?: string) {
  const date = dateOrUndefined(value);
  if (!date) return undefined;
  // Google Tasks conserva solo fecha. Usamos mediodia UTC para evitar desfases visuales de dia.
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
}

export async function listGoogleTaskLists(accessToken: string) {
  const payload = await tasksJson<{ items?: GoogleTaskList[] }>(
    accessToken,
    "users/@me/lists?maxResults=100",
  );
  return (payload.items ?? []).flatMap((list) =>
    list.id
      ? [{ id: list.id, title: list.title?.trim() || "Lista sin nombre" }]
      : [],
  );
}

export async function listGoogleTasks(accessToken: string, taskList: { id: string; title: string }) {
  const payload = await tasksJson<{ items?: GoogleTask[] }>(
    accessToken,
    `lists/${encodeURIComponent(taskList.id)}/tasks?maxResults=100&showCompleted=true&showDeleted=false&showHidden=false`,
  );
  return (payload.items ?? []).flatMap((task): ImportedGoogleTask[] => {
    if (!task.id || task.deleted || task.hidden) return [];
    const title = task.title?.trim();
    if (!title) return [];
    const completedAt = dateOrUndefined(task.completed);
    return [
      {
        taskListId: taskList.id,
        taskListTitle: taskList.title,
        taskId: task.id,
        title,
        notes: task.notes?.trim() || undefined,
        status: task.status === "completed" ? TaskStatus.EXECUTED : TaskStatus.PENDING,
        dueDate: dueDateOrUndefined(task.due),
        completedAt,
        updatedAt: dateOrUndefined(task.updated),
        webViewLink: task.webViewLink,
      },
    ];
  });
}

export async function listAllGoogleTasks(accessToken: string) {
  const lists = await listGoogleTaskLists(accessToken);
  const tasksByList = await Promise.all(lists.map((list) => listGoogleTasks(accessToken, list)));
  return tasksByList.flat();
}
