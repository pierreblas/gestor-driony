"use client";

import { useCallback, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { STATUS_LABEL, TASK_STATUSES, isTaskPriority, isTaskStatus } from "@/lib/constants";
import type { TaskWithRelations, TeamOption, UserOption } from "@/lib/queries";
import { cn, describeDueDate, type DueTone } from "@/lib/utils";
import { Avatar, TeamDot } from "@/components/ui/Avatar";
import { PriorityLabel } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { CompleteCheckbox } from "@/components/ui/CompleteCheckbox";
import { Modal } from "@/components/ui/Modal";
import { TaskForm } from "./TaskForm";
import { useTaskActions } from "./useTaskActions";

const DUE_TONE: Record<DueTone, string> = {
  muted: "text-muted",
  default: "text-ink-2",
  warning: "font-medium text-warning-ink",
  critical: "font-medium text-critical-ink",
};

export function TaskTable({
  tasks,
  teams,
  users,
  emptyTitle = "No hay tareas que coincidan",
  emptyDescription = "Prueba con otros filtros o crea una tarea nueva.",
}: {
  tasks: TaskWithRelations[];
  teams: TeamOption[];
  users: UserOption[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const actions = useTaskActions(tasks);
  const [editing, setEditing] = useState<TaskWithRelations | null>(null);
  const closeEdit = useCallback(() => setEditing(null), []);

  if (tasks.length === 0) {
    return (
      <div className="card">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[920px] text-[14px]">
          <thead>
            <tr className="text-left text-[12.5px] text-muted">
              <th className="w-12 py-3 pl-5 pr-1 font-medium">
                <span className="sr-only">Hecha</span>
              </th>
              <th className="px-3 py-3 font-medium">Tarea</th>
              <th className="px-3 py-3 font-medium">Equipo</th>
              <th className="px-3 py-3 font-medium">Responsable</th>
              <th className="px-3 py-3 font-medium">Prioridad</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 font-medium">Fecha límite</th>
              <th className="px-3 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {actions.tasks.map((task) => {
              const done = task.status === "COMPLETADA";
              const due = describeDueDate(task.dueDate, done);
              return (
                <tr
                  key={task.id}
                  className={cn("border-t border-line transition-colors hover:bg-surface-2/60", done && "text-muted")}
                >
                  <td className="py-3 pl-5 pr-1">
                    <CompleteCheckbox
                      checked={done}
                      onToggle={() => actions.toggleDone(task)}
                      label={done ? `Marcar «${task.title}» como pendiente` : `Marcar «${task.title}» como hecha`}
                    />
                  </td>
                  <td className="max-w-[340px] px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setEditing(task)}
                      className={cn(
                        "text-left font-medium hover:underline",
                        done ? "text-ink-2 line-through decoration-muted" : "text-ink",
                      )}
                    >
                      {task.title}
                    </button>
                    {task.description ? (
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{task.description}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2 whitespace-nowrap text-ink-2">
                      <TeamDot slot={task.team.colorSlot} />
                      {task.team.name}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {task.assignee ? (
                      <span className="flex items-center gap-2 whitespace-nowrap text-ink-2">
                        <Avatar name={task.assignee.name} size="sm" muted={!task.assignee.active} />
                        {task.assignee.name}
                      </span>
                    ) : (
                      <span className="text-muted">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {isTaskPriority(task.priority) ? <PriorityLabel priority={task.priority} /> : task.priority}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      aria-label={`Estado de ${task.title}`}
                      className="control h-8 w-auto min-w-[150px] py-0 text-[13px]"
                      value={task.status}
                      onChange={(e) => {
                        if (isTaskStatus(e.target.value)) actions.setStatus(task.id, e.target.value);
                      }}
                    >
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={cn("whitespace-nowrap px-3 py-3 text-[13.5px]", DUE_TONE[due.tone])}>{due.text}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Editar"
                        aria-label={`Editar ${task.title}`}
                        onClick={() => setEditing(task)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="icon-btn hover:text-critical-ink"
                        title="Eliminar"
                        aria-label={`Eliminar ${task.title}`}
                        onClick={() => actions.remove(task)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={editing !== null} onClose={closeEdit} title="Editar tarea">
        {editing ? <TaskForm task={editing} teams={teams} users={users} onSuccess={closeEdit} /> : null}
      </Modal>
    </>
  );
}
