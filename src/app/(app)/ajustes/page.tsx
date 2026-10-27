import type { Metadata } from "next";
import { CircleAlert, CircleCheck, ShieldCheck, Sparkles } from "lucide-react";
import { AI_MODELS, OPENAI_MODEL_SUGGESTIONS, getAiSettings } from "@/lib/ai";
import { AiForm } from "@/components/settings/AiForm";
import { requireAdmin } from "@/lib/auth/session";
import { masterEmail } from "@/lib/auth/roles";
import { getSettings, isEmailConfigured } from "@/lib/email";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmtpForm } from "@/components/settings/SmtpForm";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const me = await requireAdmin();
  const [settings, configured, ai] = await Promise.all([getSettings(), isEmailConfigured(), getAiSettings()]);
  const activeAi = ai.provider === "openai" ? ai.openai : ai.anthropic;
  const master = masterEmail();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ajustes" description="Configura el correo, el copiloto y revisa la cuenta principal." />

      <Card>
        <CardHeader
          title="Correo saliente (SMTP)"
          subtitle="Con esto llegan las invitaciones, los enlaces para activar la cuenta y los de cambiar contraseña."
          action={
            configured ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-good-ink">
                <CircleCheck className="h-4 w-4" aria-hidden />
                Configurado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-warning-ink">
                <CircleAlert className="h-4 w-4" aria-hidden />
                Sin configurar
              </span>
            )
          }
        />
        <div className="px-5 pb-5">
          {!configured ? (
            <p className="mb-5 rounded-[10px] bg-warning-soft px-4 py-3 text-[14px] text-warning-ink">
              Mientras no esté configurado, al añadir a una persona verás un enlace de activación para enviárselo tú.
            </p>
          ) : null}
          <SmtpForm
            configured={configured}
            adminEmail={me.email}
            initial={{
              smtpHost: settings?.smtpHost ?? "",
              smtpPort: settings?.smtpPort ?? null,
              smtpSecure: settings?.smtpSecure ?? true,
              smtpUser: settings?.smtpUser ?? "",
              hasPassword: Boolean(settings?.smtpPassEnc),
              smtpFromName: settings?.smtpFromName ?? "Driony",
              smtpFromEmail: settings?.smtpFromEmail ?? "",
              appUrl: settings?.appUrl ?? "",
            }}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Copiloto (IA)"
          subtitle="Convierte lo que alguien escribe en tareas y sugiere tareas por equipo. Funciona con Claude (Anthropic) o con ChatGPT (OpenAI)."
          action={
            activeAi.key ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-good-ink">
                <Sparkles className="h-4 w-4" aria-hidden />
                {ai.provider === "openai" ? "Activado con OpenAI" : "Activado con Claude"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-muted">
                <CircleAlert className="h-4 w-4" aria-hidden />
                Sin clave
              </span>
            )
          }
        />
        <div className="px-5 pb-5">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            Cada uso del copiloto se cobra en la cuenta del proveedor elegido. Se le envían los nombres de los equipos, de
            las personas y de las tareas abiertas para que sus propuestas tengan sentido. Las tareas solo
            se crean cuando alguien las revisa y pulsa «Crear».
          </p>
          <AiForm
            provider={ai.provider}
            anthropicModels={AI_MODELS.map((m) => ({ id: m.id, label: m.label }))}
            openaiSuggestions={OPENAI_MODEL_SUGGESTIONS}
            anthropic={{
              source: ai.anthropic.source,
              hint: ai.anthropic.source === "ajustes" && ai.anthropic.key ? ai.anthropic.key.slice(-4) : null,
              model: ai.anthropic.model,
            }}
            openai={{
              source: ai.openai.source,
              hint: ai.openai.source === "ajustes" && ai.openai.key ? ai.openai.key.slice(-4) : null,
              model: ai.openai.model,
            }}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Cuenta master" subtitle="La administración principal de la aplicación." />
        <div className="flex items-start gap-3 px-5 pb-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div className="text-[14px] leading-relaxed text-ink-2">
            <p className="font-medium text-ink">{master || "Sin definir"}</p>
            <p>
              Siempre tiene rol de administración y no se puede desactivar ni eliminar. Para cambiarla, edita
              MASTER_EMAIL en el archivo .env y reinicia la aplicación.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
