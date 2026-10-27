"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { saveTask } from "@/lib/actions/tasks";
import { toast } from "@/lib/feedback";
import type { TeamOption } from "@/lib/queries";
import { Button } from "@/components/ui/Button";
import { DueDateChips, dueDateShortcuts } from "@/components/tasks/TaskForm";

/** Type a task, press Enter. It's assigned to me, for today by default. */
export function QuickAdd({ meId, teams }: { meId: string; teams: TeamOption[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(() => dueDateShortcuts()[0].value);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (teams.length === 0) {
    return (
      <p className="card px-5 py-4 text-[14px] text-ink-2">
        Para añadir tareas primero tienes que formar parte de un equipo.
      </p>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = title.trim();
    if (text.length < 3) {
      setError("Escribe al menos 3 letras.");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("title", text);
    formData.set("teamId", teamId);
    formData.set("assigneeId", meId);
    formData.set("status", "PENDIENTE");
    formData.set("priority", "MEDIA");
    formData.set("dueDate", due);
    startTransition(async () => {
      const result = await saveTask(null, formData);
      if (result && !result.ok) {
        const fieldError = result.fieldErrors?.title?.[0];
        setError(fieldError ?? result.message);
        return;
      }
      toast("Tarea añadida a tu lista");
      setTitle("");
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card px-4 py-4 sm:px-5">
      <label htmlFor="quick-add" className="mb-2 block text-[14px] font-semibold text-ink">
        Añadir una tarea
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          id="quick-add"
          className="control h-11 text-[15px]"
          placeholder="Escribe qué tienes que hacer y pulsa Enter"
          value={title}
          maxLength={140}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "quick-add-error" : undefined}
        />
        <Button type="submit" loading={isPending} className="h-11 px-5">
          <Plus className="h-4 w-4" aria-hidden />
          Añadir
        </Button>
      </div>
      {error ? (
        <p id="quick-add-error" role="alert" className="mt-2 text-[13px] text-critical-ink">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <DueDateChips value={due} onChange={setDue} />
        {teams.length > 1 ? (
          <label className="flex items-center gap-2 text-[13.5px] text-ink-2">
            Equipo
            <select
              className="control h-8 w-auto py-0 text-[13.5px]"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </form>
  );
}
