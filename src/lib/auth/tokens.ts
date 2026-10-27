import { prisma } from "@/lib/prisma";
import { appBaseUrl, passwordEmail, sendEmail, type SendResult } from "@/lib/email";
import { randomToken, sha256 } from "./crypto";

const INVITE_HOURS = 72;
const RESET_HOURS = 2;

/**
 * Create a single-use link to set a password. First time it also confirms the email
 * ("Activa tu cuenta"); afterwards it works as "Cambia tu contraseña".
 */
export async function createPasswordLink(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  const firstTime = !user?.passwordHash;
  const hours = firstTime ? INVITE_HOURS : RESET_HOURS;
  const token = randomToken();

  // Older links stop working when a new one is issued.
  await prisma.authToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.authToken.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + hours * 3_600_000) },
  });

  const url = `${await appBaseUrl()}/contrasena?token=${token}`;
  return { url, firstTime, hours };
}

export async function sendPasswordLink(user: { id: string; name: string; email: string }): Promise<
  SendResult & { url: string }
> {
  const link = await createPasswordLink(user.id);
  const mail = passwordEmail({ name: user.name, url: link.url, firstTime: link.firstTime, hours: link.hours });
  const result = await sendEmail(user.email, mail.subject, mail.text, mail.html);
  return { ...result, url: link.url };
}

/** Look up a link without using it (to show the right page). */
export async function findValidToken(token: string) {
  if (!token) return null;
  const row = await prisma.authToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, name: true, email: true, active: true, passwordHash: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.active) return null;
  return row;
}
