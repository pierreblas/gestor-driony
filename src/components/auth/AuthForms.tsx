"use client";

import Link from "next/link";
import { startTransition, useActionState, type FormEvent } from "react";
import { CircleCheck } from "lucide-react";
import { login, requestPasswordLink, setPasswordWithToken, setupMaster } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { PasswordInput } from "./PasswordInput";

/** Submit through a transition so typed values stay when the server answers with an error. */
function submitWith(dispatch: (fd: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}

function errorsOf(state: ActionState): { message: string | null; fields: Record<string, string[] | undefined> } {
  return state && !state.ok ? { message: state.message, fields: state.fieldErrors ?? {} } : { message: null, fields: {} };
}

export function LoginForm({ next }: { next?: string }) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(login, null);
  const { message } = errorsOf(state);

  return (
    <form onSubmit={submitWith(dispatch)} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Correo" htmlFor="login-email">
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          className="control h-11"
          placeholder="nombre@empresa.com"
          autoFocus
          required
        />
      </Field>
      <Field label="Contraseña" htmlFor="login-password">
        <PasswordInput id="login-password" name="password" autoComplete="current-password" required />
      </Field>
      <FormError message={message} />
      <Button type="submit" loading={pending} className="h-11 text-[15px]">
        Entrar
      </Button>
      <p className="text-center text-[13.5px] text-ink-2">
        La sesión queda guardada en este dispositivo.
      </p>
      <Link href="/recuperar" className="text-center text-[14px] font-medium text-accent-strong hover:underline">
        ¿Primera vez o no recuerdas tu contraseña?
      </Link>
    </form>
  );
}

export function RequestLinkForm() {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(requestPasswordLink, null);
  const { message } = errorsOf(state);

  if (state?.ok) {
    return (
      <div className="text-center">
        <CircleCheck className="mx-auto h-10 w-10 text-good" aria-hidden />
        <p className="mt-3 text-[15px] leading-relaxed text-ink">{state.message}</p>
        <Link href="/login" className="mt-5 inline-block text-[14px] font-medium text-accent-strong hover:underline">
          Volver a entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submitWith(dispatch)} className="flex flex-col gap-4" noValidate>
      <Field label="Tu correo" htmlFor="link-email">
        <input
          id="link-email"
          name="email"
          type="email"
          autoComplete="email"
          className="control h-11"
          placeholder="nombre@empresa.com"
          autoFocus
          required
        />
      </Field>
      <FormError message={message} />
      <Button type="submit" loading={pending} className="h-11 text-[15px]">
        Enviarme el enlace
      </Button>
      <Link href="/login" className="text-center text-[14px] font-medium text-accent-strong hover:underline">
        Volver a entrar
      </Link>
    </form>
  );
}

export function SetPasswordForm({ token, firstTime }: { token: string; firstTime: boolean }) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(setPasswordWithToken, null);
  const { message, fields } = errorsOf(state);

  return (
    <form onSubmit={submitWith(dispatch)} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="Contraseña nueva" htmlFor="pw-new" hint="Al menos 8 caracteres." error={fields.password}>
        <PasswordInput id="pw-new" name="password" autoComplete="new-password" autoFocus required />
      </Field>
      <Field label="Repítela" htmlFor="pw-confirm" error={fields.confirm}>
        <PasswordInput id="pw-confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      <FormError message={message} />
      <Button type="submit" loading={pending} className="h-11 text-[15px]">
        {firstTime ? "Activar mi cuenta" : "Guardar contraseña"}
      </Button>
    </form>
  );
}

export function MasterSetupForm({ email }: { email: string }) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(setupMaster, null);
  const { message, fields } = errorsOf(state);

  return (
    <form onSubmit={submitWith(dispatch)} className="flex flex-col gap-4" noValidate>
      <Field label="Correo master" htmlFor="master-email" hint="Se define en el archivo .env (MASTER_EMAIL).">
        <input id="master-email" className="control h-11 bg-surface-2" value={email} readOnly />
      </Field>
      <Field label="Tu nombre" htmlFor="master-name" error={fields.name}>
        <input id="master-name" name="name" className="control h-11" autoComplete="name" autoFocus required />
      </Field>
      <Field label="Contraseña" htmlFor="master-pw" hint="Al menos 8 caracteres." error={fields.password}>
        <PasswordInput id="master-pw" name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Repítela" htmlFor="master-confirm" error={fields.confirm}>
        <PasswordInput id="master-confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      <FormError message={message} />
      <Button type="submit" loading={pending} className="h-11 text-[15px]">
        Crear cuenta master
      </Button>
    </form>
  );
}
