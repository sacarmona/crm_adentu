import { TaskStatus } from "@prisma/client";

const TASKS_API_URL = "https://tasks.googleapis.com/tasks/v1";

export const GOOGLE_TASK_SCOPES = ["https://www.googleapis.com/auth/tasks"];

export function googleTasksScopesGranted(scope?: string | null) {
  const granted = new Set((scope ?? "").split(/\s+/).filter(Boolean));
  // Acepta tanto el scope completo (tasks) como el legacy readonly
  return (
    granted.has("https://www.googleapis.com/auth/tasks") ||
    granted.has("https://www.googleapis.com/auth/tasks.readonly")
  );
}

export function googleTasksWriteGranted(scope?: string | null) {
  const granted = new Set((scope ?? "").split(/\s+/).filter(Boolean));
  return granted.has("https://www.googleapis.com/auth/tasks");
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

export async function createGoogleTask(
  accessToken: string,
  input: { title: string; notes?: string; dueDate?: Date },
): Promise<string> {
  const body: Record<string, unknown> = { title: input.title };
  if (input.notes) body.notes = input.notes;
  if (input.dueDate) {
    // Google Tasks requiere fecha RFC 3339 con hora en cero UTC
    const d = input.dueDate;
    body.due = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T00:00:00.000Z`;
  }

  const response = await fetch(`${TASKS_API_URL}/lists/@default/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google Tasks rechazo la creacion (${response.status}).`);
  }

  const created = (await response.json()) as { id?: string };
  if (!created.id) throw new Error("Google Tasks no retorno el ID de la tarea creada.");
  return created.id;
}
