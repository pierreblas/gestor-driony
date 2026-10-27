"use client";

import { useCallback, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { Hand, Play } from "lucide-react";
import type { TaskWithRelations, TeamOption, UserOption } from "@/lib/queries";
import { cn, describeDueDate, type DueTone } from "@/lib/utils";
import { TeamDot } from "@/components/ui/Avatar";
import { Badge, PriorityLabel } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CompleteCheckbox } from "@/components/ui/CompleteCheckbox";
import { Modal } from "@/components/ui/Modal";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useTaskActions } from "@/components/tasks/useTaskActions";

const DUE_TONE: Record<DueTone, string> = {
  muted: "text-muted",
  default: "text-ink-2",
  warning: "font-medium text-warning-ink",
  critical: "font-medium text-critical-ink",
};

type Group = { key: string; title: string; hint?: string; tone?: "critical"; tasks: TaskWithRelations[] };

function groupTasks(tasks: TaskWithRelations[], meId: string): { groups: Group[]; available: TaskWithRelations[] } {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(todayStart);
  const weekEnd = endOfDay(new Date(todayStart.getTime() + 7 * 86_400_000));

  const mine = tasks.filter((t) => t.assigneeId === meId);
  const open = mine.filter((t) => t.status !== "COMPLETADA");

  const overdue = open.filter((t) => t.dueDate && t.dueDate < todayStart);
  const today = open.filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= todayEnd);
  const week = open.filter((t) => t.dueDate && t.dueDate > todayEnd && t.dueDate <= weekEnd);
  const later = open.filter((t) => !t.dueDate || t.dueDate > weekEnd);
  const done = mine.filter((t) => t.status === "COMPLETADA");

  return {
    groups: [
      { key: "overdue", title: "Con retraso", hint: "Ya pasó su fecha", tone: "critical", tasks: overdue },
      { key: "today", title: "Para hoy", tasks: today },
      { key: "week", title: "Esta semana", tasks: week },
      { key: "later", title: "Más adelante o sin fecha", tasks: later },
      { key: "done", title: "Hechas estos días", tasks: done },
    ],
    available: tasks.filter((t) => !t.assigneeId && t.status !== "COMPLETADA"),
  };
}

export function MyTasks({
  tasks,
  meId,
  teams,
  users,
}: {
  tasks: TaskWithRelations[];
  meId: string;
  teams: TeamOption[];
  users: UserOption[];
}) {
  const actions = useTaskActions(tasks);
  const [editing, setEditing] = useState<TaskWithRelations | null>(null);
  const closeEdit = useCallback(() => setEditing(null), []);
  const { groups, available } = groupTasks(actions.tasks, meId);
  const openCount = groups.filter((g) => g.key !== "done").reduce((n, g) => n + g.tasks.length, 0);

  return (
    <>
      {openCount === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="font-display text-[22px] font-semibold text-ink">No tienes nada pendiente</p>
          <p className="mt-1 text-[15px] text-ink-2">
            Añade una tarea arriba o quédate con alguna de tu equipo.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-5" data-tour="task-list">
        {groups
          .filter((g) => g.tasks.length > 0)
          .map((group) => (
            <section key={group.key} aria-labelledby={`grupo-${group.key}`} className="card overflow-hidden">
              <header className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-4">
                <h2
                  id={`grupo-${group.key}`}
                  className={cn(
                    "text-[16px] font-semibold",
                    group.tone === "critical" ? "text-critical-ink" : "text-ink",
                  )}
                >
                  {group.title} <span className="font-normal text-muted">({group.tasks.length})</span>
                </h2>
                {group.hint ? <span className="text-[13px] text-muted">{group.hint}</span> : null}
              </header>
              <ul className="divide-y divide-line">
                {group.tasks.map((task) => {
                  const done = task.status === "COMPLETADA";
                  const due = describeDueDate(task.dueDate, done);
                  return (
                    <li key={task.id} className="flex items-center gap-3.5 px-5 py-3.5">
                      <CompleteCheckbox
                        size="lg"
                        checked={done}
                        onToggle={() => actions.toggleDone(task)}
                        label={done ? `Marcar «${task.title}» como pendiente` : `Marcar «${task.title}» como hecha`}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setEditing(task)}
                          className={cn(
                            "text-left text-[15.5px] font-medium leading-snug hover:underline",
                            done ? "text-ink-2 line-through decoration-muted" : "text-ink",
                          )}
                        >
                          {task.title}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                          <span className="flex items-center gap-1.5 text-ink-2">
                            <TeamDot slot={task.team.colorSlot} />
                            {task.team.name}
                          </span>
                          {task.dueDate ? <span className={DUE_TONE[due.tone]}>{due.text}</span> : null}
                          {!done && (task.priority === "ALTA" || task.priority === "URGENTE") ? (
                            <PriorityLabel priority={task.priority} className="text-[13px]" />
                          ) : null}
                        </div>
                      </div>
                      {task.status === "PENDIENTE" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => actions.setStatus(task.id, "EN_PROGRESO")}
                          title="Marcar que ya la estás haciendo"
                        >
                          <Play className="h-3.5 w-3.5" aria-hidden />
                          Empezar
                        </Button>
                      ) : task.status === "EN_PROGRESO" ? (
                        <Badge tone="accent">Haciéndola</Badge>
                      ) : task.status === "EN_REVISION" ? (
                        <Badge tone="warning">En revisión</Badge>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

        {available.length > 0 ? (
          <section aria-labelledby="grupo-libres" className="card overflow-hidden">
            <header className="px-5 pb-2 pt-4">
              <h2 id="grupo-libres" className="text-[16px] font-semibold text-ink">
                Sin responsable en tus equipos <span className="font-normal text-muted">({available.length})</span>
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-2">Si puedes ayudar, quédate con alguna.</p>
            </header>
            <ul className="divide-y divide-line">
              {available.map((task) => {
                const due = describeDueDate(task.dueDate);
                return (
                  <li key={task.id} className="flex items-center gap-3.5 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-ink">{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                        <span className="flex items-center gap-1.5 text-ink-2">
                          <TeamDot slot={task.team.colorSlot} />
                          {task.team.name}
                        </span>
                        {task.dueDate ? <span className={DUE_TONE[due.tone]}>{due.text}</span> : null}
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => actions.assign(task.id, meId)}>
                      <Hand className="h-3.5 w-3.5" aria-hidden />
                      Me la quedo
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <Modal open={editing !== null} onClose={closeEdit} title="Editar tarea">
        {editing ? <TaskForm task={editing} teams={teams} users={users} onSuccess={closeEdit} /> : null}
      </Modal>
    </>
  );
}
