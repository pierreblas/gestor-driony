"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/auth/crypto";
import { createTransport, getSmtpConfig, sendEmail, testEmail } from "@/lib/email";
import { AI_MODELS, DEFAULT_AI_MODEL, DEFAULT_OPENAI_MODEL, getAiConfig, isAiProvider, testAiConnection } from "@/lib/ai";
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

/** Connect to the SMTP server and send a test message (to the admin by default). */
export async function sendTestEmail(to?: string): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;

  const target = (to ?? "").trim() || guard.user.email;
  if (!z.email().safeParse(target).success) {
    return { ok: false, message: "Escribe un correo válido para la prueba.", fieldErrors: { testTo: ["Correo no válido"] } };
  }

  const config = await getSmtpConfig();
  if (!config) return { ok: false, message: "Primero guarda el servidor, el puerto y el correo remitente." };

  try {
    await createTransport(config).verify();
  } catch (error) {
    return { ok: false, message: `No se pudo conectar con el servidor de correo: ${errorText(error)}` };
  }

  const mail = testEmail();
  const result = await sendEmail(target, mail.subject, mail.text, mail.html);
  if (!result.sent) return { ok: false, message: `La conexión funciona pero el envío falló: ${result.error ?? "error desconocido"}` };
  return { ok: true, message: `Correo de prueba enviado a ${target}. Si no lo ves, mira en spam.` };
}

function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/EAUTH|Invalid login|535/i.test(message)) return "usuario o contraseña incorrectos.";
  if (/ENOTFOUND|EAI_AGAIN/i.test(message)) return "no se encuentra el servidor. Revisa el nombre.";
  if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(message)) return "no responde. Revisa el puerto y el tipo de seguridad.";
  if (/wrong version number|SSL/i.test(message)) return "el tipo de seguridad no coincide con el puerto (465 usa SSL, 587 usa STARTTLS).";
  return message;
}

/* ---------- Copilot (Anthropic or OpenAI) ---------- */

export async function saveAiSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;

  const provider = str(formData, "aiProvider") ?? "anthropic";
  if (!isAiProvider(provider)) return { ok: false, message: "Elige un proveedor." };

  const model = str(formData, "aiModel") ?? DEFAULT_AI_MODEL;
  if (!AI_MODELS.some((m) => m.id === model)) {
    return { ok: false, message: "Elige un modelo de la lista.", fieldErrors: { aiModel: ["Modelo no válido"] } };
  }
  const openaiModel = (str(formData, "openaiModel") ?? "").trim() || DEFAULT_OPENAI_MODEL;
  if (!/^[\w.:-]{2,80}$/.test(openaiModel)) {
    return { ok: false, message: "Revisa el nombre del modelo de OpenAI.", fieldErrors: { openaiModel: ["Nombre no válido"] } };
  }

  const anthropicKey = (str(formData, "aiApiKey") ?? "").trim();
  const openaiKey = (str(formData, "openaiApiKey") ?? "").trim();
  if (anthropicKey && !/^sk-ant-[\w-]{20,}$/.test(anthropicKey)) {
    return { ok: false, message: "Esa clave no tiene el formato de Anthropic.", fieldErrors: { aiApiKey: ["Debe empezar por sk-ant-"] } };
  }
  if (openaiKey && !/^sk-[\w-]{20,}$/.test(openaiKey)) {
    return { ok: false, message: "Esa clave no tiene el formato de OpenAI.", fieldErrors: { openaiApiKey: ["Debe empezar por sk-"] } };
  }

  const patch = {
    aiProvider: provider,
    aiModel: model,
    openaiModel,
    ...(str(formData, "clearAiKey") === "on" ? { aiApiKeyEnc: null } : anthropicKey ? { aiApiKeyEnc: encryptSecret(anthropicKey) } : {}),
    ...(str(formData, "clearOpenaiKey") === "on"
      ? { openaiApiKeyEnc: null }
      : openaiKey
        ? { openaiApiKeyEnc: encryptSecret(openaiKey) }
        : {}),
  };
  try {
    await prisma.settings.upsert({ where: { id: 1 }, update: patch, create: { id: 1, ...patch } });
    revalidateAll();
    return { ok: true, message: `Copiloto guardado. Usará ${provider === "openai" ? "OpenAI" : "Anthropic"}.` };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo guardar el copiloto.") };
  }
}

export async function testAiSettings(): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;
  const { provider, apiKey, model } = await getAiConfig();
  if (!apiKey) {
    return { ok: false, message: `Primero guarda una clave de ${provider === "openai" ? "OpenAI" : "Anthropic"}.` };
  }
  const result = await testAiConnection(provider, apiKey, model);
  return result.ok ? { ok: true, message: result.message } : { ok: false, message: result.message };
}
