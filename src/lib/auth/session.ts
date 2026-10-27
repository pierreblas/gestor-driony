import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomToken, sha256 } from "./crypto";
import { canManageWork, isAdmin, isMasterEmail } from "./roles";

export const SESSION_COOKIE = "driony_sesion";
/** Sessions last 90 days and renew themselves while the person keeps using the app. */
export const SESSION_DAYS = 90;
const SESSION_MS = SESSION_DAYS * 86_400_000;
/** Extend the stored expiry once fewer than this many days remain (avoids a write per request). */
const RENEW_BELOW_MS = (SESSION_DAYS - 7) * 86_400_000;

/**
 * Secure cookies only travel over HTTPS. Use them when the app is served with https
 * (APP_URL), or force with COOKIE_SECURE=true/false. Over plain http they would be dropped.
 */
export function secureCookiesEnabled() {
  const forced = process.env.COOKIE_SECURE;
  if (forced === "true") return true;
  if (forced === "false") return false;
  return (process.env.APP_URL ?? "").startsWith("https://");
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: secureCookiesEnabled(),
  path: "/",
  maxAge: SESSION_DAYS * 86_400,
};

/** Create a session and set the cookie. Only callable from Server Actions. */
export async function createSession(userId: string) {
  const token = randomToken();
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_MS) },
  });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(SESSION_COOKIE);
}

/** The signed-in person for this request, or null. Cached per request. */
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          memberships: { select: { teamId: true } },
        },
      },
    },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now || !session.user.active) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.expiresAt.getTime() - now < RENEW_BELOW_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { expiresAt: new Date(now + SESSION_MS) } })
      .catch(() => undefined);
  }

  const { user } = session;
  const master = isMasterEmail(user.email);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: master ? "ADMIN" : user.role,
    isMaster: master,
    teamIds: user.memberships.map((m) => m.teamId),
  };
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

/** For pages: send to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages restricted to managers: members go back to their own tasks. */
export async function requireManager(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageWork(user.role)) redirect("/mis-tareas");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user.role)) redirect(canManageWork(user.role) ? "/" : "/mis-tareas");
  return user;
}
