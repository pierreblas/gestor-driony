"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, sha256, verifyPassword } from "@/lib/auth/crypto";
import { masterEmail } from "@/lib/auth/roles";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";
import { findValidToken, sendPasswordLink } from "@/lib/auth/tokens";
import { passwordChangedEmail, sendEmail } from "@/lib/email";
import type { ActionState } from "@/lib/validation";
import { revalidateAll, str } from "./helpers";

const passwordRule = z
  .string()
  .min(8, "Usa al menos 8 caracteres")
  .max(200, "Demasiado larga");

/* ---------- Simple brute-force protection (per server process) ---------- */

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

function tooManyAttempts(key: string) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else entry.count += 1;
}

/* ---------- Login / logout ---------- */

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = (str(formData, "email") ?? "").trim().toLowerCase();
  const password = str(formData, "password") ?? "";
  if (!email || !password) return { ok: false, message: "Escribe tu correo y tu contraseña." };

  if (tooManyAttempts(email)) {
    return { ok: false, message: "Demasiados intentos. Espera 15 minutos o pide un enlace para cambiar la contraseña." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, active: true, passwordHash: true },
  });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    recordFailure(email);
    if (user && !user.passwordHash) {
      return {
        ok: false,
        message: "Tu cuenta aún no está activada. Pulsa «¿Primera vez o no recuerdas tu contraseña?» para recibir el enlace.",
      };
    }
    return { ok: false, message: "El correo o la contraseña no son correctos." };
  }
  if (!user.active) {
    return { ok: false, message: "Tu cuenta está desactivada. Habla con la administración." };
  }

  attempts.delete(email);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  const next = str(formData, "next");
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/mis-tareas");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/* ---------- Activation / password reset by email ---------- */

export async function requestPasswordLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.email().safeParse((str(formData, "email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { ok: false, message: "Escribe un correo válido." };
  const email = parsed.data;

  if (tooManyAttempts(`link:${email}`)) {
    return { ok: false, message: "Ya pediste varios enlaces. Revisa tu correo o espera unos minutos." };
  }
  recordFailure(`link:${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, active: true },
  });

  // Same answer whether or not the address exists, so nobody can probe for accounts.
  const generic: ActionState = {
    ok: true,
    message: "Si el correo está registrado, en unos minutos te llegará un enlace. Revisa también la carpeta de spam.",
  };
  if (!user || !user.active) return generic;

  const result = await sendPasswordLink(user);
  if (!result.sent && result.reason === "not-configured") {
    return {
      ok: false,
      message: "El envío de correos todavía no está configurado. Pide a la administración tu enlace de acceso.",
    };
  }
  if (!result.sent) {
    return { ok: false, message: "No pudimos enviar el correo ahora mismo. Inténtalo más tarde o avisa a la administración." };
  }
  return generic;
}

export async function setPasswordWithToken(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = str(formData, "token") ?? "";
  const password = str(formData, "password") ?? "";
  const confirm = str(formData, "confirm") ?? "";

  const parsed = passwordRule.safeParse(password);
  if (!parsed.success) {
    return { ok: false, message: "Revisa la contraseña.", fieldErrors: { password: [parsed.error.issues[0].message] } };
  }
  if (password !== confirm) {
    return { ok: false, message: "Las contraseñas no coinciden.", fieldErrors: { confirm: ["No coincide con la anterior"] } };
  }

  const row = await findValidToken(token);
  if (!row) return { ok: false, message: "Este enlace ya no es válido. Pide uno nuevo." };

  const hadPassword = Boolean(row.user.passwordHash);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date(), lastLoginAt: new Date() },
    }),
    prisma.authToken.update({ where: { tokenHash: sha256(token) }, data: { usedAt: new Date() } }),
    // A new password signs out every other device.
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);

  if (hadPassword) {
    const mail = passwordChangedEmail(row.user.name);
    await sendEmail(row.user.email, mail.subject, mail.text, mail.html);
  } else {
    await prisma.activity.create({
      data: { type: "USUARIO_ACTUALIZADO", message: `${row.user.name} activó su cuenta`, userId: row.userId },
    });
  }

  await createSession(row.userId);
  redirect("/mis-tareas");
}

/* ---------- First run: the master account picks its password ---------- */

export async function masterNeedsSetup() {
  const email = masterEmail();
  if (!email) return false;
  const user = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true } });
  return !user?.passwordHash;
}

export async function setupMaster(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = masterEmail();
  if (!email) return { ok: false, message: "Falta MASTER_EMAIL en el archivo .env." };
  if (!(await masterNeedsSetup())) return { ok: false, message: "La cuenta master ya está configurada. Inicia sesión." };

  const name = (str(formData, "name") ?? "").trim();
  const password = str(formData, "password") ?? "";
  const confirm = str(formData, "confirm") ?? "";

  const fieldErrors: Record<string, string[]> = {};
  if (name.length < 2) fieldErrors.name = ["Escribe tu nombre"];
  const pw = passwordRule.safeParse(password);
  if (!pw.success) fieldErrors.password = [pw.error.issues[0].message];
  else if (password !== confirm) fieldErrors.confirm = ["No coincide con la anterior"];
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revisa los campos marcados.", fieldErrors };

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: "ADMIN", active: true, passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
    create: { name, email, role: "ADMIN", jobTitle: "Administración", passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
  });
  await prisma.activity.create({
    data: { type: "USUARIO_ACTUALIZADO", message: `${name} configuró la cuenta master`, userId: user.id },
  });
  await createSession(user.id);
  redirect("/ajustes");
}

/* ---------- My account ---------- */

export async function updateMyAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getSessionUser();
  if (!me) return { ok: false, message: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const name = (str(formData, "name") ?? "").trim();
  if (name.length < 2) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { name: ["Escribe tu nombre"] } };

  const current = str(formData, "currentPassword") ?? "";
  const next = str(formData, "newPassword") ?? "";

  if (next) {
    const pw = passwordRule.safeParse(next);
    if (!pw.success) return { ok: false, message: "Revisa la contraseña.", fieldErrors: { newPassword: [pw.error.issues[0].message] } };
    const user = await prisma.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
    if (!(await verifyPassword(current, user?.passwordHash))) {
      return { ok: false, message: "La contraseña actual no es correcta.", fieldErrors: { currentPassword: ["No es correcta"] } };
    }
    await prisma.user.update({ where: { id: me.id }, data: { name, passwordHash: await hashPassword(next) } });
    // Keep this device signed in, close the rest.
    await prisma.session.deleteMany({ where: { userId: me.id } });
    await createSession(me.id);
    const mail = passwordChangedEmail(name);
    await sendEmail(me.email, mail.subject, mail.text, mail.html);
    revalidateAll();
    return { ok: true, message: "Contraseña cambiada. Se cerró la sesión en tus otros dispositivos." };
  }

  await prisma.user.update({ where: { id: me.id }, data: { name } });
  revalidateAll();
  return { ok: true, message: "Datos guardados" };
}

export async function signOutEverywhere(): Promise<ActionState> {
  const me = await getSessionUser();
  if (!me) return { ok: false, message: "Tu sesión terminó." };
  await prisma.session.deleteMany({ where: { userId: me.id } });
  await createSession(me.id);
  return { ok: true, message: "Se cerró la sesión en tus otros dispositivos." };
}

/** Remember that this person finished or skipped the guided tour. */
export async function markTutorialSeen(): Promise<void> {
  const me = await getSessionUser();
  if (!me) return;
  await prisma.user.update({ where: { id: me.id }, data: { tutorialSeenAt: new Date() } });
}
