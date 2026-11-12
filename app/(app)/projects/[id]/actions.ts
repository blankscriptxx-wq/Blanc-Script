"use server";

import { revalidatePath } from "next/cache";
import { createTask, setTaskStatus, type TaskStatus } from "@/lib/data/tasks";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

function parseStatus(value: string | null, fallback: TaskStatus): TaskStatus {
  return STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : fallback;
}

export async function createTaskAction(
  _prev: { ok: boolean; error: string } | null,
  formData: FormData,
) {
  const projectId = (formData.get("projectId") as string) || "";
  try {
    const dueRaw = (formData.get("dueAt") as string) || "";
    await createTask({
      projectId,
      title: (formData.get("title") as string) ?? "",
      status: parseStatus(formData.get("status") as string | null, "todo"),
      dueAt: dueRaw ? new Date(dueRaw) : null,
    });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, error: "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Could not add task." };
  }
}

export async function moveTaskAction(formData: FormData): Promise<void> {
  const taskId = (formData.get("taskId") as string) || "";
  const projectId = (formData.get("projectId") as string) || "";
  const status = parseStatus(formData.get("status") as string | null, "todo");
  if (!taskId) return;
  await setTaskStatus(taskId, status);
  revalidatePath(`/projects/${projectId}`);
}
