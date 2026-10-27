"use client";

import { useOptimistic, useTransition } from "react";
import { assignTask, deleteTask, updateTaskStatus } from "@/lib/actions/tasks";
import { STATUS_LABEL, type TaskStatus } from "@/lib/constants";
import { confirmAction, toast, toastResult } from "@/lib/feedback";

type TaskLike = { id: string; title: string; status: string; assigneeId: string | null };
type Patch = { id: string; status?: string; assigneeId?: string | null };

/**
 * Shared task actions with instant feedback: the list updates right away,
 * a toast confirms, and completing or moving a task can be undone.
 */
export function useTaskActions<T extends TaskLike>(tasks: T[]) {
  const [optimistic, apply] = useOptimistic(tasks, (current: T[], patch: Patch) =>
    current.map((t) => (t.id === patch.id ? { ...t, ...stripId(patch) } : t)),
  );
  const [, startTransition] = useTransition();

  /** Send a status change without comparing to local state (the undo closure would be stale). */
  function commitStatus(id: string, next: TaskStatus, previous: TaskStatus | null) {
    startTransition(async () => {
      apply({ id, status: next });
      const result = await updateTaskStatus(id, next);
      if (result && !result.ok) {
        toast(result.message, { tone: "error" });
        return;
      }
      if (!previous) {
        toast("Cambio deshecho");
        return;
      }
      toast(next === "COMPLETADA" ? "¡Tarea completada!" : `Movida a ${STATUS_LABEL[next]}`, {
        action: { label: "Deshacer", onClick: () => commitStatus(id, previous, null) },
      });
    });
  }

  function setStatus(id: string, next: TaskStatus) {
    const current = optimistic.find((t) => t.id === id);
    if (!current || current.status === next) return;
    commitStatus(id, next, current.status as TaskStatus);
  }

  function toggleDone(task: TaskLike) {
    setStatus(task.id, task.status === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA");
  }

  function assign(id: string, userId: string | null) {
    startTransition(async () => {
      apply({ id, assigneeId: userId });
      toastResult(await assignTask(id, userId));
    });
  }

  async function remove(task: TaskLike) {
    const ok = await confirmAction({
      title: "¿Eliminar esta tarea?",
      message: `«${task.title}» se borrará para siempre. Si solo está terminada, mejor márcala como hecha.`,
      confirmLabel: "Eliminar tarea",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      toastResult(await deleteTask(task.id));
    });
  }

  return { tasks: optimistic, setStatus, toggleDone, assign, remove };
}

function stripId({ id: _id, ...rest }: Patch) {
  void _id;
  return rest;
}
