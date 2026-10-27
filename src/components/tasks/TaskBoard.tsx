"use client";

import { useCallback, useState, type DragEvent } from "react";
import {
  STATUS_CHART_VAR,
  STATUS_LABEL,
  TASK_STATUSES,
  isTaskPriority,
  isTaskStatus,
  type TaskStatus,
} from "@/lib/constants";
import type { TaskWithRelations, TeamOption, UserOption } from "@/lib/queries";
import { cn, describeDueDate, type DueTone } from "@/lib/utils";
import { Avatar, TeamDot } from "@/components/ui/Avatar";
import { PriorityLabel } from "@/components/ui/Badge";
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

export function TaskBoard({
  tasks,
  teams,
  users,
}: {
  tasks: TaskWithRelations[];
  teams: TeamOption[];
  users: UserOption[];
}) {
  const actions = useTaskActions(tasks);
  const optimisticTasks = actions.tasks;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<TaskWithRelations | null>(null);
  const closeEdit = useCallback(() => setEditing(null), []);

  function move(id: string, status: TaskStatus) {
    actions.setStatus(id, status);
  }

  function handleDrop(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragId;
    if (id) move(id, status);
    setOverColumn(null);
    setDragId(null);
  }

  const columns = TASK_STATUSES.map((status) => ({
    status,
    items: optimisticTasks.filter((t) => t.status === status),
  }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <section
            key={column.status}
            aria-label={STATUS_LABEL[column.status]}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overColumn !== column.status) setOverColumn(column.status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverColumn(null);
            }}
            onDrop={(e) => handleDrop(e, column.status)}
            className={cn(
              "card flex min-h-[260px] flex-col transition-shadow",
              overColumn === column.status && "ring-2 ring-accent/50",
            )}
          >
            <header className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: STATUS_CHART_VAR[column.status] }}
                />
                {STATUS_LABEL[column.status]}
              </h2>
              <span className="tabular text-[13px] text-muted">{column.items.length}</span>
            </header>

            <ul className="flex flex-1 flex-col gap-2 px-3 pb-3">
              {column.items.map((task) => {
                const done = task.status === "COMPLETADA";
                const due = describeDueDate(task.dueDate, done);
                return (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", task.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(task.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "rounded-[10px] border border-line bg-surface p-3 cursor-grab active:cursor-grabbing",
                      dragId === task.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <CompleteCheckbox
                        checked={done}
                        onToggle={() => actions.toggleDone(task)}
                        label={done ? `Marcar «${task.title}» como pendiente` : `Marcar «${task.title}» como hecha`}
                      />
                      <button
                        type="button"
                        onClick={() => setEditing(task)}
                        className={cn(
                          "text-left text-[14px] font-medium leading-snug hover:underline",
                          done ? "text-ink-2 line-through decoration-muted" : "text-ink",
                        )}
                      >
                        {task.title}
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-ink-2">
                        <TeamDot slot={task.team.colorSlot} />
                        <span className="truncate">{task.team.name}</span>
                      </span>
                      {isTaskPriority(task.priority) ? (
                        <PriorityLabel priority={task.priority} className="text-[12.5px]" />
                      ) : null}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className={cn("text-[12.5px]", DUE_TONE[due.tone])}>{due.text}</span>
                      {task.assignee ? (
                        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                          <Avatar name={task.assignee.name} size="sm" muted={!task.assignee.active} />
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-muted">Sin asignar</span>
                      )}
                    </div>

                    <select
                      aria-label={`Mover «${task.title}» a`}
                      className="control mt-2.5 h-7 py-0 text-[12px] text-ink-2"
                      value={task.status}
                      onChange={(e) => {
                        if (isTaskStatus(e.target.value)) move(task.id, e.target.value);
                      }}
                    >
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
              {column.items.length === 0 ? (
                <li className="rounded-[10px] border border-dashed border-line-strong px-3 py-8 text-center text-[13px] text-muted">
                  Suelta aquí una tarea
                </li>
              ) : null}
            </ul>
          </section>
        ))}
      </div>

      <Modal open={editing !== null} onClose={closeEdit} title="Editar tarea">
        {editing ? <TaskForm task={editing} teams={teams} users={users} onSuccess={closeEdit} /> : null}
      </Modal>
    </>
  );
}
