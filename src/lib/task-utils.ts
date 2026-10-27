import { startOfDay } from "date-fns";
import { TASK_STATUSES, type TaskStatus } from "./constants";

/** Open tasks first (soonest due date first, no date last), then completed (most recent first). */
export function sortTasks<
  T extends { status: string; dueDate: Date | null; completedAt: Date | null; createdAt: Date },
>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === "COMPLETADA";
    const bDone = b.status === "COMPLETADA";
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (aDone && bDone) {
      return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
    }
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export type TaskSummary = {
  total: number;
  open: number;
  completed: number;
  overdue: number;
  byStatus: Record<TaskStatus, number>;
};

export function summarizeTasks(
  tasks: { status: string; dueDate: Date | null }[],
  now = new Date(),
): TaskSummary {
  const todayStart = startOfDay(now);
  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<TaskStatus, number>;
  let overdue = 0;
  for (const t of tasks) {
    if (t.status in byStatus) byStatus[t.status as TaskStatus] += 1;
    if (t.status !== "COMPLETADA" && t.dueDate && t.dueDate < todayStart) overdue += 1;
  }
  const completed = byStatus.COMPLETADA;
  return { total: tasks.length, open: tasks.length - completed, completed, overdue, byStatus };
}
