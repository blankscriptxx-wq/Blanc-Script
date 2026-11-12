"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import {
  createTaskAction,
  moveTaskAction,
} from "@/app/(app)/projects/[id]/actions";
import type { TaskRow, TaskStatus } from "@/lib/data/tasks";
import { cn } from "@/lib/cn";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_TONE: Record<TaskStatus, Tone> = {
  todo: "neutral",
  in_progress: "info",
  blocked: "warning",
  done: "success",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export function TasksBoard({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskRow[];
}) {
  const grouped = React.useMemo(() => {
    const map: Record<TaskStatus, TaskRow[]> = {
      todo: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.map((status) => {
        const items = grouped[status];
        return (
          <div
            key={status}
            className="flex flex-col rounded-md border border-bs-border bg-bs-surface"
          >
            <div className="flex items-center justify-between gap-2 border-b border-bs-border px-3 py-2.5">
              <StatusPill tone={STATUS_TONE[status]}>
                {STATUS_LABEL[status]}
              </StatusPill>
              <span className="text-xs tabular-nums text-bs-subtle">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {items.length === 0 ? (
                <p className="px-1 py-3 text-xs text-bs-subtle">—</p>
              ) : (
                items.map((t) => (
                  <TaskCard key={t.id} task={t} projectId={projectId} />
                ))
              )}
              <AddTask projectId={projectId} status={status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task, projectId }: { task: TaskRow; projectId: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-bs-border bg-bs-surface-2 p-2.5">
      <span className="text-sm font-medium leading-snug text-bs-text">
        {task.title}
      </span>
      {task.dueAt ? (
        <span className="text-xs tabular-nums text-bs-subtle">
          Due {dateFmt.format(new Date(task.dueAt))}
        </span>
      ) : null}
      <form action={moveTaskAction} className="mt-0.5">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="projectId" value={projectId} />
        <label className="sr-only" htmlFor={`status-${task.id}`}>
          Move task
        </label>
        <select
          id={`status-${task.id}`}
          name="status"
          defaultValue={task.status}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-8 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-2 pr-7 text-xs text-bs-text outline-none"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </form>
    </div>
  );
}

function AddTask({
  projectId,
  status,
}: {
  projectId: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(createTaskAction, null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium text-bs-subtle transition-colors hover:bg-bs-surface-2 hover:text-bs-text"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }

  const inputCls =
    "h-8 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-2 text-xs text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-2 rounded-sm border border-bs-border bg-bs-surface-2 p-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="status" value={status} />
      <input
        name="title"
        required
        autoFocus
        placeholder="Task title"
        className={inputCls}
      />
      <input type="date" name="dueAt" className={cn(inputCls, "text-bs-muted")} />
      {state && !state.ok ? (
        <p className="text-xs text-bs-danger">{state.error}</p>
      ) : null}
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
    </form>
  );
}
