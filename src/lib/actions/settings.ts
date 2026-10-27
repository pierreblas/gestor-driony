"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/auth/crypto";
import { createTransport, getSmtpConfig, sendEmail, testEmail } from "@/lib/email";
import { AI_MODELS, DEFAULT_AI_MODEL, getAiConfig, testAiConnection } from "@/lib/ai";
import { smtpSchema, type ActionState } from "@/lib/validation";
import { errorMessage, guardAdmin, revalidateAll, str } from "./helpers";

export async function saveSmtpSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;

  const parsed = smtpSchema.safeParse({
    smtpHost: str(formData, "smtpHost"),
    smtpPort: str(formData, "smtpPort"),
    smtpSecure: str(formData, "smtpSecure") === "ssl",
    smtpUser: str(formData, "smtpUser"),
    smtpFromName: str(formData, "smtpFromName"),
    smtpFromEmail: str(formData, "smtpFromEmail"),
    appUrl: str(formData, "appUrl"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // An empty password field keeps the saved one; "clearPassword" removes it.
  const newPassword = str(formData, "smtpPass") ?? "";
  const clearPassword = str(formData, "clearPassword") === "on";
  const passwordPatch = clearPassword
    ? { smtpPassEnc: null }
    : newPassword
      ? { smtpPassEnc: encryptSecret(newPassword) }
      : {};

  try {
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { ...parsed.data, ...passwordPatch },
      create: { id: 1, ...parsed.data, ...("smtpPassEnc" in passwordPatch ? passwordPatch : {}) },
    });
    revalidateAll();
    return { ok: true, message: "Configuración del correo guardada" };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo guardar la configuración.") };
  }
}

/** Connect to the SMTP server and send a test message to the signed-in admin. */
export async function sendTestEmail(): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;

  const config = await getSmtpConfig();
  if (!config) return { ok: false, message: "Primero guarda el servidor, el puerto y el correo remitente." };

  try {
    await createTransport(config).verify();
  } catch (error) {
    return { ok: false, message: `No se pudo conectar con el servidor de correo: ${errorText(error)}` };
  }

  const mail = testEmail();
  const result = await sendEmail(guard.user.email, mail.subject, mail.text, mail.html);
  if (!result.sent) return { ok: false, message: `La conexión funciona pero el envío falló: ${result.error ?? "error desconocido"}` };
  return { ok: true, message: `Correo de prueba enviado a ${guard.user.email}` };
}

function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/EAUTH|Invalid login|535/i.test(message)) return "usuario o contraseña incorrectos.";
  if (/ENOTFOUND|EAI_AGAIN/i.test(message)) return "no se encuentra el servidor. Revisa el nombre.";
  if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(message)) return "no responde. Revisa el puerto y el tipo de seguridad.";
  if (/wrong version number|SSL/i.test(message)) return "el tipo de seguridad no coincide con el puerto (465 usa SSL, 587 usa STARTTLS).";
  return message;
}

/* ---------- Copilot (Claude API) ---------- */

export async function saveAiSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;

  const model = str(formData, "aiModel") ?? DEFAULT_AI_MODEL;
  if (!AI_MODELS.some((m) => m.id === model)) {
    return { ok: false, message: "Elige un modelo de la lista.", fieldErrors: { aiModel: ["Modelo no válido"] } };
  }
  const newKey = (str(formData, "aiApiKey") ?? "").trim();
  const clearKey = str(formData, "clearAiKey") === "on";
  if (newKey && !/^sk-ant-[\w-]{20,}$/.test(newKey)) {
    return {
      ok: false,
      message: "Esa clave no tiene el formato de Anthropic.",
      fieldErrors: { aiApiKey: ["Debe empezar por sk-ant-"] },
    };
  }

  const keyPatch = clearKey ? { aiApiKeyEnc: null } : newKey ? { aiApiKeyEnc: encryptSecret(newKey) } : {};
  try {
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { aiModel: model, ...keyPatch },
      create: { id: 1, aiModel: model, ...keyPatch },
    });
    revalidateAll();
    return { ok: true, message: clearKey ? "Clave del copiloto borrada" : "Copiloto guardado" };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo guardar el copiloto.") };
  }
}

export async function testAiSettings(): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;
  const { apiKey, model } = await getAiConfig();
  if (!apiKey) return { ok: false, message: "Primero guarda una clave de API." };
  const result = await testAiConnection(apiKey, model);
  return result.ok ? { ok: true, message: result.message } : { ok: false, message: result.message };
}
