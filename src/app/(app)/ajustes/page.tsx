import type { Metadata } from "next";
import { CircleAlert, CircleCheck, ShieldCheck, Sparkles } from "lucide-react";
import { AI_MODELS, getAiConfig } from "@/lib/ai";
import { AiForm } from "@/components/settings/AiForm";
import { requireAdmin } from "@/lib/auth/session";
import { masterEmail } from "@/lib/auth/roles";
import { getSettings, isEmailConfigured } from "@/lib/email";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmtpForm } from "@/components/settings/SmtpForm";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  await requireAdmin();
  const [settings, configured, ai] = await Promise.all([getSettings(), isEmailConfigured(), getAiConfig()]);
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
          subtitle="Ayuda a convertir lo que alguien escribe en tareas y sugiere tareas por equipo. Usa Claude, de Anthropic."
          action={
            ai.apiKey ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-good-ink">
                <Sparkles className="h-4 w-4" aria-hidden />
                Activado
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
            Cada uso del copiloto se cobra en tu cuenta de Anthropic según el modelo elegido. Envía a Claude los nombres de
            los equipos, de las personas y de las tareas abiertas para que sus propuestas tengan sentido. Las tareas solo
            se crean cuando alguien las revisa y pulsa «Crear».
          </p>
          <AiForm
            models={AI_MODELS.map((m) => ({ id: m.id, label: m.label }))}
            model={ai.model}
            source={ai.source}
            keyHint={ai.source === "ajustes" && ai.apiKey ? ai.apiKey.slice(-4) : null}
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
