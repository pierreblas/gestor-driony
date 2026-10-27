"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { saveUser } from "@/lib/actions/users";
import { ROLE_DESCRIPTION, ROLE_LABEL, USER_ROLES, isUserRole, type UserRole } from "@/lib/constants";
import type { TeamOption } from "@/lib/queries";
import { toast } from "@/lib/feedback";
import type { ActionState } from "@/lib/validation";
import { TeamDot } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";

export type UserFormUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  active: boolean;
  teamIds: string[];
};

export function UserForm({
  user,
  teams,
  onSuccess,
  lockedMaster = false,
}: {
  user?: UserFormUser | null;
  teams: TeamOption[];
  onSuccess?: (result?: { message?: string; link?: string }) => void;
  lockedMaster?: boolean;
}) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(saveUser, null);
  const [role, setRole] = useState<UserRole>(user && isUserRole(user.role) ? user.role : "MIEMBRO");

  useEffect(() => {
    if (!state?.ok) return;
    // With a link to share, the dialog shows it instead of a toast.
    if (state.message && !state.link) toast(state.message);
    onSuccess?.({ message: state.message, link: state.link });
  }, [state, onSuccess]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok ? state.message : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {user ? <input type="hidden" name="id" value={user.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" htmlFor="user-name" error={fieldErrors.name}>
          <input
            id="user-name"
            name="name"
            className="control"
            defaultValue={user?.name ?? ""}
            placeholder="Nombre y apellido"
            maxLength={80}
            autoFocus
            aria-invalid={fieldErrors.name ? true : undefined}
          />
        </Field>
        <Field label="Correo" htmlFor="user-email" error={fieldErrors.email}>
          <input
            id="user-email"
            name="email"
            type="email"
            className="control"
            defaultValue={user?.email ?? ""}
            readOnly={lockedMaster}
            placeholder="nombre@empresa.com"
            aria-invalid={fieldErrors.email ? true : undefined}
          />
        </Field>
      </div>

      <Field label="Puesto" htmlFor="user-job" hint="Opcional" error={fieldErrors.jobTitle}>
        <input
          id="user-job"
          name="jobTitle"
          className="control"
          defaultValue={user?.jobTitle ?? ""}
          placeholder="Diseñadora de producto, Analista…"
        />
      </Field>

      <Field label="Rol" htmlFor="user-role" hint={ROLE_DESCRIPTION[role]} error={fieldErrors.role}>
        <select
          id="user-role"
          name="role"
          className="control"
          value={role}
          disabled={lockedMaster}
          onChange={(e) => {
            if (isUserRole(e.target.value)) setRole(e.target.value);
          }}
        >
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </Field>

      {lockedMaster ? <input type="hidden" name="role" value="ADMIN" /> : null}
      {lockedMaster ? (
        <p className="-mt-2 text-[13px] text-muted">Es la cuenta master: siempre es administradora y no se puede desactivar.</p>
      ) : null}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13.5px] font-medium text-ink">Equipos</legend>
        {teams.length === 0 ? (
          <p className="text-[13px] text-muted">Aún no hay equipos. Podrás asignarlos después.</p>
        ) : (
          <ul className="grid gap-0.5 rounded-control border border-line-strong p-1.5 sm:grid-cols-2">
            {teams.map((team) => (
              <li key={team.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    name="teamIds"
                    value={team.id}
                    defaultChecked={user?.teamIds.includes(team.id) ?? false}
                    className="h-4 w-4 accent-accent"
                  />
                  <TeamDot slot={team.colorSlot} />
                  <span className="truncate text-[13.5px] text-ink">{team.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {user && !lockedMaster ? (
        <div className="flex items-start gap-3 rounded-control border border-line bg-surface-2/60 px-3.5 py-3">
          <input type="hidden" name="activeProvided" value="1" />
          <input
            id="user-active"
            name="active"
            type="checkbox"
            defaultChecked={user.active}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <label htmlFor="user-active" className="cursor-pointer">
            <span className="block text-[14px] font-medium text-ink">Usuario activo</span>
            <span className="block text-[13px] text-ink-2">
              Las personas inactivas conservan su historial pero no aparecen al asignar tareas.
            </span>
          </label>
        </div>
      ) : null}

      <FormError message={formError} />

      <div className="flex justify-end pt-1">
        <Button type="submit" loading={pending}>
          {user ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
