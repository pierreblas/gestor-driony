"use client";

import { startTransition, useActionState, useEffect, useTransition, type FormEvent } from "react";
import { Zap } from "lucide-react";
import { saveAiSettings, testAiSettings } from "@/lib/actions/settings";
import { toast, toastResult } from "@/lib/feedback";
import type { ActionState } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { PasswordInput } from "@/components/auth/PasswordInput";

export function AiForm({
  models,
  model,
  keyHint,
  source,
}: {
  models: { id: string; label: string }[];
  model: string;
  /** Last characters of the saved key, never the key itself. */
  keyHint: string | null;
  source: "ajustes" | "env" | null;
}) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(saveAiSettings, null);
  const [testing, startTest] = useTransition();

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

  const hint =
    source === "ajustes"
      ? `Guardada (termina en ${keyHint}). Déjala vacía para no cambiarla.`
      : source === "env"
        ? "Ahora se usa la clave ANTHROPIC_API_KEY del servidor. Si escribes una aquí, tendrá prioridad."
        : "Créala en console.anthropic.com, en API Keys. Empieza por sk-ant-.";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Clave de API de Anthropic" htmlFor="ai-key" hint={hint} error={fields.aiApiKey}>
        <PasswordInput
          id="ai-key"
          name="aiApiKey"
          autoComplete="off"
          placeholder={source === "ajustes" ? "••••••••" : "sk-ant-..."}
          aria-invalid={fields.aiApiKey ? true : undefined}
        />
      </Field>
      {source === "ajustes" ? (
        <label className="-mt-2 flex items-center gap-2 text-[13.5px] text-ink-2">
          <input type="checkbox" name="clearAiKey" className="h-4 w-4 accent-accent" />
          Borrar la clave guardada
        </label>
      ) : null}

      <Field
        label="Modelo"
        htmlFor="ai-model"
        hint="Opus da las mejores propuestas. Sonnet y Haiku responden antes y cuestan menos."
        error={fields.aiModel}
      >
        <select id="ai-model" name="aiModel" className="control" defaultValue={model}>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <FormError message={message} />

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <Button
          type="button"
          variant="secondary"
          loading={testing}
          disabled={!source}
          title={source ? undefined : "Guarda una clave primero"}
          onClick={() => startTest(async () => void toastResult(await testAiSettings()))}
        >
          <Zap className="h-4 w-4" aria-hidden />
          Probar conexión
        </Button>
        <Button type="submit" loading={pending}>
          Guardar copiloto
        </Button>
      </div>
    </form>
  );
}
