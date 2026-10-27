"use client";

import { startTransition, useActionState, useEffect, useState, useTransition, type FormEvent } from "react";
import { Send } from "lucide-react";
import { saveSmtpSettings, sendTestEmail } from "@/lib/actions/settings";
import { toast, toastResult } from "@/lib/feedback";
import type { ActionState } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { PasswordInput } from "@/components/auth/PasswordInput";

export type SmtpFormValues = {
  smtpHost: string;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string;
  hasPassword: boolean;
  smtpFromName: string;
  smtpFromEmail: string;
  appUrl: string;
};

const PRESETS = [
  { label: "Gmail", host: "smtp.gmail.com", port: 465, ssl: true },
  { label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: 587, ssl: false },
  { label: "Zoho", host: "smtp.zoho.com", port: 465, ssl: true },
];

export function SmtpForm({ initial, configured }: { initial: SmtpFormValues; configured: boolean }) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(saveSmtpSettings, null);
  const [testing, startTest] = useTransition();
  const [host, setHost] = useState(initial.smtpHost);
  const [port, setPort] = useState(initial.smtpPort ? String(initial.smtpPort) : "");
  const [security, setSecurity] = useState(initial.smtpSecure ? "ssl" : "starttls");

  useEffect(() => {
    if (state?.ok && state.message) toast(state.message);
  }, [state]);

  const fields = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const message = state && !state.ok ? state.message : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setHost(preset.host);
    setPort(String(preset.port));
    setSecurity(preset.ssl ? "ssl" : "starttls");
  }

  function test() {
    startTest(async () => {
      toastResult(await sendTestEmail());
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <p className="mb-2 text-[13.5px] font-medium text-ink">Rellenar con un proveedor conocido</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="h-8 rounded-full border border-line-strong px-3 text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Servidor SMTP" htmlFor="smtp-host" error={fields.smtpHost}>
          <input
            id="smtp-host"
            name="smtpHost"
            className="control"
            placeholder="smtp.gmail.com"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            aria-invalid={fields.smtpHost ? true : undefined}
          />
        </Field>
        <Field label="Puerto" htmlFor="smtp-port" error={fields.smtpPort}>
          <input
            id="smtp-port"
            name="smtpPort"
            inputMode="numeric"
            className="control"
            placeholder="465"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            aria-invalid={fields.smtpPort ? true : undefined}
          />
        </Field>
      </div>

      <Field
        label="Seguridad"
        htmlFor="smtp-security"
        hint="El puerto 465 usa SSL. Los puertos 587 y 25 usan STARTTLS."
      >
        <select
          id="smtp-security"
          name="smtpSecure"
          className="control"
          value={security}
          onChange={(e) => setSecurity(e.target.value)}
        >
          <option value="ssl">SSL/TLS (puerto 465)</option>
          <option value="starttls">STARTTLS (puerto 587 o 25)</option>
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Usuario" htmlFor="smtp-user" hint="Normalmente tu correo completo." error={fields.smtpUser}>
          <input
            id="smtp-user"
            name="smtpUser"
            className="control"
            autoComplete="off"
            defaultValue={initial.smtpUser}
            placeholder="avisos@empresa.com"
          />
        </Field>
        <Field
          label="Contraseña"
          htmlFor="smtp-pass"
          hint={initial.hasPassword ? "Guardada. Déjala vacía para no cambiarla." : "En Gmail usa una contraseña de aplicación."}
        >
          <PasswordInput
            id="smtp-pass"
            name="smtpPass"
            autoComplete="new-password"
            placeholder={initial.hasPassword ? "••••••••" : ""}
          />
        </Field>
      </div>
      {initial.hasPassword ? (
        <label className="-mt-2 flex items-center gap-2 text-[13.5px] text-ink-2">
          <input type="checkbox" name="clearPassword" className="h-4 w-4 accent-accent" />
          Borrar la contraseña guardada
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del remitente" htmlFor="smtp-from-name" hint="Lo que verán en la bandeja de entrada.">
          <input
            id="smtp-from-name"
            name="smtpFromName"
            className="control"
            defaultValue={initial.smtpFromName}
            placeholder="Driony"
          />
        </Field>
        <Field label="Correo remitente" htmlFor="smtp-from" error={fields.smtpFromEmail}>
          <input
            id="smtp-from"
            name="smtpFromEmail"
            type="email"
            className="control"
            defaultValue={initial.smtpFromEmail}
            placeholder="avisos@empresa.com"
            aria-invalid={fields.smtpFromEmail ? true : undefined}
          />
        </Field>
      </div>

      <Field
        label="Dirección de la aplicación"
        htmlFor="app-url"
        hint="Se usa en los enlaces de los correos. Si la dejas vacía se usa APP_URL del archivo .env."
        error={fields.appUrl}
      >
        <input
          id="app-url"
          name="appUrl"
          className="control"
          defaultValue={initial.appUrl}
          placeholder="https://tareas.empresa.com"
          aria-invalid={fields.appUrl ? true : undefined}
        />
      </Field>

      <FormError message={message} />

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={test}
          loading={testing}
          disabled={!configured}
          title={configured ? undefined : "Guarda la configuración primero"}
        >
          <Send className="h-4 w-4" aria-hidden />
          Enviarme un correo de prueba
        </Button>
        <Button type="submit" loading={pending}>
          Guardar configuración
        </Button>
      </div>
    </form>
  );
}
