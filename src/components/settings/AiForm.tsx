"use client";

import { startTransition, useActionState, useEffect, useState, useTransition, type FormEvent } from "react";
import { Zap } from "lucide-react";
import { saveAiSettings, testAiSettings } from "@/lib/actions/settings";
import { toast, toastResult } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { ExtLink, HowTo } from "./HowTo";

type KeyState = { source: "ajustes" | "env" | null; hint: string | null };

export function AiForm({
  provider: initialProvider,
  anthropic,
  openai,
  anthropicModels,
  openaiSuggestions,
}: {
  provider: "anthropic" | "openai";
  anthropic: KeyState & { model: string };
  openai: KeyState & { model: string };
  anthropicModels: { id: string; label: string }[];
  openaiSuggestions: string[];
}) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(saveAiSettings, null);
  const [testing, startTest] = useTransition();
  const [provider, setProvider] = useState(initialProvider);

  useEffect(() => {
    if (state?.ok && state.message) toast(state.message);
  }, [state]);

  const fields = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const message = state && !state.ok ? state.message : null;
  const savedProviderHasKey = (initialProvider === "openai" ? openai : anthropic).source !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  function keyHint(k: KeyState, envName: string, prefix: string) {
    if (k.source === "ajustes") return `Guardada (termina en ${k.hint}). Déjala vacía para no cambiarla.`;
    if (k.source === "env") return `Ahora se usa ${envName} del servidor. Si escribes una aquí, tendrá prioridad.`;
    return `Empieza por ${prefix}. Mira abajo cómo conseguirla.`;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-medium text-ink">Proveedor de IA</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { id: "anthropic", name: "Claude", by: "de Anthropic" },
              { id: "openai", name: "ChatGPT", by: "de OpenAI" },
            ] as const
          ).map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-control border px-3.5 py-3 transition-colors",
                provider === p.id ? "border-accent bg-accent-soft/60" : "border-line-strong hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name="aiProvider"
                value={p.id}
                checked={provider === p.id}
                onChange={() => setProvider(p.id)}
                className="h-4 w-4 accent-accent"
              />
              <span>
                <span className="block text-[14.5px] font-semibold text-ink">{p.name}</span>
                <span className="block text-[12.5px] text-ink-2">{p.by}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Both sections stay in the form so switching provider never loses what was typed. */}
      <div className={cn("flex flex-col gap-4", provider !== "anthropic" && "hidden")}>
        <Field
          label="Clave de API de Anthropic"
          htmlFor="ai-key"
          hint={keyHint(anthropic, "ANTHROPIC_API_KEY", "sk-ant-")}
          error={fields.aiApiKey}
        >
          <PasswordInput
            id="ai-key"
            name="aiApiKey"
            autoComplete="off"
            placeholder={anthropic.source === "ajustes" ? "••••••••" : "sk-ant-..."}
            aria-invalid={fields.aiApiKey ? true : undefined}
          />
        </Field>
        {anthropic.source === "ajustes" ? (
          <label className="-mt-2 flex items-center gap-2 text-[13.5px] text-ink-2">
            <input type="checkbox" name="clearAiKey" className="h-4 w-4 accent-accent" />
            Borrar la clave guardada de Anthropic
          </label>
        ) : null}
        <Field label="Modelo" htmlFor="ai-model" hint="Opus da las mejores propuestas. Sonnet y Haiku responden antes y cuestan menos." error={fields.aiModel}>
          <select id="ai-model" name="aiModel" className="control" defaultValue={anthropic.model}>
            {anthropicModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <HowTo
          title="Cómo conseguir la clave de Anthropic"
          steps={[
            <>
              Entra en <ExtLink href="https://console.anthropic.com">console.anthropic.com</ExtLink> y crea una cuenta o inicia sesión.
            </>,
            <>En el menú, abre Settings y después API Keys.</>,
            <>Pulsa «Create Key», ponle un nombre como «Driony» y copia la clave. Solo se muestra una vez.</>,
            <>En Billing, añade un método de pago o créditos. Sin saldo la clave no funciona.</>,
            <>Pégala arriba, pulsa «Guardar copiloto» y después «Probar conexión».</>,
          ]}
        />
      </div>

      <div className={cn("flex flex-col gap-4", provider !== "openai" && "hidden")}>
        <Field
          label="Clave de API de OpenAI"
          htmlFor="openai-key"
          hint={keyHint(openai, "OPENAI_API_KEY", "sk-")}
          error={fields.openaiApiKey}
        >
          <PasswordInput
            id="openai-key"
            name="openaiApiKey"
            autoComplete="off"
            placeholder={openai.source === "ajustes" ? "••••••••" : "sk-..."}
            aria-invalid={fields.openaiApiKey ? true : undefined}
          />
        </Field>
        {openai.source === "ajustes" ? (
          <label className="-mt-2 flex items-center gap-2 text-[13.5px] text-ink-2">
            <input type="checkbox" name="clearOpenaiKey" className="h-4 w-4 accent-accent" />
            Borrar la clave guardada de OpenAI
          </label>
        ) : null}
        <Field
          label="Modelo"
          htmlFor="openai-model"
          hint="Escribe el nombre exacto del modelo. «Probar conexión» comprueba que existe y que tu cuenta tiene acceso."
          error={fields.openaiModel}
        >
          <input
            id="openai-model"
            name="openaiModel"
            className="control"
            list="openai-models"
            defaultValue={openai.model}
            autoComplete="off"
          />
          <datalist id="openai-models">
            {openaiSuggestions.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <HowTo
          title="Cómo conseguir la clave de OpenAI"
          steps={[
            <>
              Entra en <ExtLink href="https://platform.openai.com/api-keys">platform.openai.com/api-keys</ExtLink> con tu cuenta de OpenAI.
            </>,
            <>Pulsa «Create new secret key», ponle un nombre como «Driony» y copia la clave. Solo se muestra una vez.</>,
            <>
              En <ExtLink href="https://platform.openai.com/settings/organization/billing">Billing</ExtLink>, añade créditos. La suscripción de ChatGPT Plus no sirve para la API: se paga aparte.
            </>,
            <>Pégala arriba, pulsa «Guardar copiloto» y después «Probar conexión».</>,
          ]}
        />
      </div>

      <p className="text-[13px] text-muted">
        Las dos claves se guardan cifradas. Puedes tener ambas y cambiar de proveedor cuando quieras.
      </p>

      <FormError message={message} />

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <Button
          type="button"
          variant="secondary"
          loading={testing}
          disabled={!savedProviderHasKey}
          title={savedProviderHasKey ? "Prueba el proveedor guardado" : "Guarda una clave primero"}
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
