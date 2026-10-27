"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { saveTeam } from "@/lib/actions/teams";
import { TEAM_COLOR_NAMES, TEAM_COLOR_SLOTS } from "@/lib/constants";
import type { UserOption } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/feedback";
import type { ActionState } from "@/lib/validation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";

export type TeamFormTeam = {
  id: string;
  name: string;
  description: string | null;
  colorSlot: number;
  leadId: string | null;
  memberIds: string[];
};

export function TeamForm({
  team,
  users,
  onSuccess,
}: {
  team?: TeamFormTeam | null;
  users: UserOption[];
  onSuccess?: () => void;
}) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(saveTeam, null);
  const [leadId, setLeadId] = useState(team?.leadId ?? "");
  const [members, setMembers] = useState<string[]>(team?.memberIds ?? []);

  useEffect(() => {
    if (!state?.ok) return;
    if (state.message) toast(state.message);
    onSuccess?.();
  }, [state, onSuccess]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok ? state.message : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  function toggleMember(id: string, checked: boolean) {
    setMembers((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((m) => m !== id)));
  }

  const selectable = users.filter((u) => u.active || members.includes(u.id) || u.id === leadId);
  const selectedCount = new Set(leadId ? [...members, leadId] : members).size;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {team ? <input type="hidden" name="id" value={team.id} /> : null}

      <Field label="Nombre" htmlFor="team-name" error={fieldErrors.name}>
        <input
          id="team-name"
          name="name"
          className="control"
          defaultValue={team?.name ?? ""}
          placeholder="Producto, Ventas, Soporte…"
          maxLength={60}
          autoFocus
          aria-invalid={fieldErrors.name ? true : undefined}
        />
      </Field>

      <Field label="Descripción" htmlFor="team-description" hint="Opcional" error={fieldErrors.description}>
        <textarea
          id="team-description"
          name="description"
          className="control"
          defaultValue={team?.description ?? ""}
          placeholder="De qué se encarga este equipo"
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13.5px] font-medium text-ink">Color</legend>
        <div className="flex flex-wrap gap-2.5">
          {TEAM_COLOR_SLOTS.map((slot) => (
            <label key={slot} className="relative cursor-pointer" title={TEAM_COLOR_NAMES[slot]}>
              <input
                type="radio"
                name="colorSlot"
                value={slot}
                defaultChecked={(team?.colorSlot ?? 1) === slot}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="block h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition-shadow peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                style={{ background: `var(--cat-${slot})` }}
              />
              <span className="sr-only">{TEAM_COLOR_NAMES[slot]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Responsable del equipo"
        htmlFor="team-lead"
        hint="La persona responsable siempre forma parte del equipo."
        error={fieldErrors.leadId}
      >
        <select
          id="team-lead"
          name="leadId"
          className="control"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        >
          <option value="">Sin responsable</option>
          {selectable.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.active ? "" : " (inactivo)"}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13.5px] font-medium text-ink">Miembros</legend>
        {selectable.length === 0 ? (
          <p className="text-[13px] text-muted">Aún no hay usuarios. Podrás añadirlos después.</p>
        ) : (
          <ul className="grid max-h-60 gap-0.5 overflow-y-auto rounded-control border border-line-strong p-1.5 sm:grid-cols-2">
            {selectable.map((u) => {
              const isLead = u.id === leadId;
              const checked = isLead || members.includes(u.id);
              return (
                <li key={u.id}>
                  <label
                    className={cn(
                      "flex items-center gap-2.5 rounded-[8px] px-2 py-1.5",
                      isLead ? "cursor-default" : "cursor-pointer hover:bg-surface-2",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="memberIds"
                      value={u.id}
                      checked={checked}
                      disabled={isLead}
                      onChange={(e) => toggleMember(u.id, e.target.checked)}
                      className="h-4 w-4 accent-accent"
                    />
                    <Avatar name={u.name} size="sm" muted={!u.active} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{u.name}</span>
                    {isLead ? <span className="text-[11.5px] font-medium text-accent-strong">Responsable</span> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[13px] text-muted">
          {selectedCount} {selectedCount === 1 ? "persona seleccionada" : "personas seleccionadas"}
        </p>
      </fieldset>

      <FormError message={formError} />

      <div className="flex justify-end pt-1">
        <Button type="submit" loading={pending}>
          {team ? "Guardar cambios" : "Crear equipo"}
        </Button>
      </div>
    </form>
  );
}
