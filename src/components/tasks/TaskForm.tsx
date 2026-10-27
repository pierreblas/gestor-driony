"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { addDays } from "date-fns";
import { saveTask } from "@/lib/actions/tasks";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { toast } from "@/lib/feedback";
import type { TeamOption, UserOption } from "@/lib/queries";
import { cn, toDateInputValue } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { useCurrentUser } from "@/components/layout/CurrentUserProvider";

export type TaskFormTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  teamId: string;
  assigneeId: string | null;
  dueDate: Date | null;
};

export function dueDateShortcuts(today = new Date()) {
  return [
    { label: "Hoy", value: toDateInputValue(today) },
    { label: "Mañana", value: toDateInputValue(addDays(today, 1)) },
    { label: "En una semana", value: toDateInputValue(addDays(today, 7)) },
    { label: "Sin fecha", value: "" },
  ];
}

export function DueDateChips({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {dueDateShortcuts().map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 rounded-full border px-3 text-[13.5px] font-medium transition-colors",
              selected
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-line-strong text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function TaskForm({
  task,
  teams,
  users,
  defaultTeamId,
  onSuccess,
}: {
  task?: TaskFormTask | null;
  teams: TeamOption[];
  users: UserOption[];
  defaultTeamId?: string;
  onSuccess?: () => void;
}) {
  const me = useCurrentUser();
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(saveTask, null);
  const [due, setDue] = useState(toDateInputValue(task?.dueDate));

  useEffect(() => {
    if (!state?.ok) return;
    if (state.message) toast(state.message);
    onSuccess?.();
  }, [state, onSuccess]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok ? state.message : null;

  // Submitting through a transition (instead of <form action>) keeps the typed values
  // in place when the server returns validation errors.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const assignable = users.filter((u) => u.active || u.id === task?.assigneeId);
  const teamDefault =
    task?.teamId ?? defaultTeamId ?? teams.find((t) => me?.teamIds.includes(t.id))?.id ?? teams[0]?.id ?? "";
  const assigneeDefault = task ? (task.assigneeId ?? "") : (me?.id ?? "");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {task ? <input type="hidden" name="id" value={task.id} /> : null}

      <Field label="¿Qué hay que hacer?" htmlFor="task-title" error={fieldErrors.title}>
        <input
          id="task-title"
          name="title"
          className="control"
          defaultValue={task?.title ?? ""}
          placeholder="Por ejemplo: Llamar al proveedor de embalajes"
          maxLength={140}
          autoFocus
          aria-invalid={fieldErrors.title ? true : undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="¿Quién se encarga?" htmlFor="task-assignee" error={fieldErrors.assigneeId}>
          <select id="task-assignee" name="assigneeId" className="control" defaultValue={assigneeDefault}>
            <option value="">Nadie por ahora</option>
            {assignable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.id === me?.id ? " (yo)" : u.active ? "" : " (inactivo)"}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Equipo" htmlFor="task-team" error={fieldErrors.teamId}>
          <select
            id="task-team"
            name="teamId"
            className="control"
            defaultValue={teamDefault}
            aria-invalid={fieldErrors.teamId ? true : undefined}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="¿Para cuándo?" htmlFor="task-due" error={fieldErrors.dueDate}>
        <DueDateChips value={due} onChange={setDue} />
        <input
          id="task-due"
          name="dueDate"
          type="date"
          className="control mt-1 sm:w-1/2"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-invalid={fieldErrors.dueDate ? true : undefined}
        />
      </Field>

      <details className="rounded-control border border-line" open={Boolean(task)}>
        <summary className="flex cursor-pointer select-none flex-wrap items-baseline gap-x-2 px-3.5 py-2.5 text-[14px] font-medium text-ink hover:bg-surface-2/60">
          Más detalles
          <span className="text-[13px] font-normal text-muted">notas, prioridad y estado</span>
        </summary>
        <div className="flex flex-col gap-4 border-t border-line px-3.5 py-4">
          <Field label="Notas" htmlFor="task-description" hint="Opcional" error={fieldErrors.description}>
            <textarea
              id="task-description"
              name="description"
              className="control"
              defaultValue={task?.description ?? ""}
              placeholder="Detalles, enlaces o lo que haga falta para terminarla"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prioridad" htmlFor="task-priority" error={fieldErrors.priority}>
              <select id="task-priority" name="priority" className="control" defaultValue={task?.priority ?? "MEDIA"}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado" htmlFor="task-status" error={fieldErrors.status}>
              <select id="task-status" name="status" className="control" defaultValue={task?.status ?? "PENDIENTE"}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </details>

      <FormError message={formError} />

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" loading={pending}>
          {task ? "Guardar cambios" : "Crear tarea"}
        </Button>
      </div>
    </form>
  );
}
