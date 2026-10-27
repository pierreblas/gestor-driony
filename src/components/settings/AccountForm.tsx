"use client";

import { startTransition, useActionState, useEffect, useRef, useTransition, type FormEvent } from "react";
import { signOutEverywhere, updateMyAccount } from "@/lib/actions/auth";
import { toast, toastResult } from "@/lib/feedback";
import type { ActionState } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { PasswordInput } from "@/components/auth/PasswordInput";

export function AccountForm({ name, email }: { name: string; email: string }) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(updateMyAccount, null);
  const [signingOut, startSignOut] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    if (state.message) toast(state.message);
    // Clear password fields after a successful save.
    formRef.current?.querySelectorAll<HTMLInputElement>("input[type=password]").forEach((i) => (i.value = ""));
  }, [state]);

  const fields = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const message = state && !state.ok ? state.message : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="me-name" error={fields.name}>
            <input id="me-name" name="name" className="control" defaultValue={name} autoComplete="name" />
          </Field>
          <Field label="Correo" htmlFor="me-email" hint="Para cambiarlo, habla con la administración.">
            <input id="me-email" className="control bg-surface-2" value={email} readOnly />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-4 rounded-control border border-line px-4 pb-4 pt-3">
          <legend className="px-1 text-[13.5px] font-medium text-ink">Cambiar contraseña (opcional)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contraseña actual" htmlFor="me-current" error={fields.currentPassword}>
              <PasswordInput id="me-current" name="currentPassword" autoComplete="current-password" />
            </Field>
            <Field label="Contraseña nueva" htmlFor="me-new" hint="Al menos 8 caracteres." error={fields.newPassword}>
              <PasswordInput id="me-new" name="newPassword" autoComplete="new-password" />
            </Field>
          </div>
        </fieldset>

        <FormError message={message} />
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            Guardar
          </Button>
        </div>
      </form>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-medium text-ink">¿Entraste desde un ordenador que no es tuyo?</p>
          <p className="text-[13.5px] text-ink-2">Cierra la sesión en todos los demás dispositivos. Este seguirá abierto.</p>
        </div>
        <Button
          variant="secondary"
          loading={signingOut}
          onClick={() => startSignOut(async () => void toastResult(await signOutEverywhere()))}
        >
          Cerrar las demás sesiones
        </Button>
      </div>
    </>
  );
}
