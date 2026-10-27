import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { decryptSecret } from "./auth/crypto";

export async function getSettings() {
  return prisma.settings.findUnique({ where: { id: 1 } });
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  fromName: string;
  fromEmail: string;
};

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const s = await getSettings();
  if (!s?.smtpHost || !s.smtpPort || !s.smtpFromEmail) return null;
  return {
    host: s.smtpHost,
    port: s.smtpPort,
    secure: s.smtpSecure,
    user: s.smtpUser,
    pass: s.smtpPassEnc ? decryptSecret(s.smtpPassEnc) : null,
    fromName: s.smtpFromName || "Driony",
    fromEmail: s.smtpFromEmail,
  };
}

export async function isEmailConfigured() {
  return (await getSmtpConfig()) !== null;
}

/** Base URL for links in emails: Ajustes > .env APP_URL > the current request. */
export async function appBaseUrl() {
  const s = await getSettings();
  const configured = s?.appUrl || process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass ?? "" } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export type SendResult = { sent: true } | { sent: false; reason: "not-configured" | "error"; error?: string };

export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<SendResult> {
  const config = await getSmtpConfig();
  if (!config) return { sent: false, reason: "not-configured" };
  try {
    await createTransport(config).sendMail({
      from: { name: config.fromName, address: config.fromEmail },
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error("Error al enviar correo:", error);
    return { sent: false, reason: "error", error: error instanceof Error ? error.message : String(error) };
  }
}

/* ---------- Templates ---------- */

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, paragraphs: string[], button?: { label: string; url: string }, footer?: string) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#4b5565">${escapeHtml(p)}</p>`)
    .join("");
  const cta = button
    ? `<p style="margin:22px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#2a78d6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:9px">${escapeHtml(button.label)}</a></p>
       <p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:#8a94a6">Si el botón no funciona, copia este enlace en el navegador:<br><a href="${escapeHtml(button.url)}" style="color:#1c5cab;word-break:break-all">${escapeHtml(button.url)}</a></p>`
    : "";
  const foot = footer ? `<p style="margin:18px 0 0;font-size:13px;color:#8a94a6">${escapeHtml(footer)}</p>` : "";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#eef1f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f1a2b">Driony</p>
    <div style="background:#ffffff;border:1px solid #e0e5ec;border-radius:14px;padding:28px">
      <h1 style="margin:0 0 14px;font-size:21px;color:#101828">${escapeHtml(title)}</h1>
      ${body}${cta}${foot}
    </div>
  </div></body></html>`;
}

export function passwordEmail(opts: { name: string; url: string; firstTime: boolean; hours: number }) {
  const first = opts.name.split(" ")[0];
  if (opts.firstTime) {
    const subject = "Activa tu cuenta de Driony";
    const lines = [
      `Hola, ${first}.`,
      "Ya tienes cuenta en Driony, donde verás tus tareas y las de tu equipo. Para entrar, confirma tu correo y elige una contraseña.",
    ];
    const footer = `El enlace caduca en ${opts.hours} horas. Si no esperabas este correo, puedes ignorarlo.`;
    return {
      subject,
      text: `${lines.join("\n\n")}\n\nActiva tu cuenta: ${opts.url}\n\n${footer}`,
      html: layout(subject, lines, { label: "Activar mi cuenta", url: opts.url }, footer),
    };
  }
  const subject = "Cambia tu contraseña de Driony";
  const lines = [`Hola, ${first}.`, "Pediste cambiar tu contraseña. Pulsa el botón para elegir una nueva."];
  const footer = `El enlace caduca en ${opts.hours} horas. Si no lo pediste tú, ignora este correo: tu contraseña no cambia.`;
  return {
    subject,
    text: `${lines.join("\n\n")}\n\nElegir contraseña: ${opts.url}\n\n${footer}`,
    html: layout(subject, lines, { label: "Elegir nueva contraseña", url: opts.url }, footer),
  };
}

export function passwordChangedEmail(name: string) {
  const subject = "Tu contraseña de Driony se cambió";
  const lines = [
    `Hola, ${name.split(" ")[0]}.`,
    "Te confirmamos que la contraseña de tu cuenta se acaba de cambiar.",
    "Si no fuiste tú, avisa enseguida a la administración.",
  ];
  return { subject, text: lines.join("\n\n"), html: layout(subject, lines) };
}

export function testEmail() {
  const subject = "Prueba de correo de Driony";
  const lines = ["Si lees esto, la configuración del correo funciona.", "Ya se pueden enviar invitaciones y avisos."];
  return { subject, text: lines.join("\n\n"), html: layout(subject, lines) };
}
