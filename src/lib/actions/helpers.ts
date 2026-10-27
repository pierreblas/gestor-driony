import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { canManageWork, isAdmin } from "@/lib/auth/roles";

export function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  return value;
}

export function strList(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** Every page reads live data, so one layout-level revalidation is enough. */
export function revalidateAll() {
  revalidatePath("/", "layout");
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return `${fallback} (${error.message})`;
  return fallback;
}

/** Who is acting, for activity messages. */
export async function getActor() {
  const user = await getSessionUser();
  return user ? { id: user.id, name: user.name } : null;
}

type ActionError = { ok: false; message: string };
type Guard = { user: SessionUser; error?: undefined } | { user?: undefined; error: ActionError };

const SIGNED_OUT: ActionError = { ok: false, message: "Tu sesión terminó. Vuelve a iniciar sesión." };
const FORBIDDEN: ActionError = { ok: false, message: "No tienes permiso para hacer esto." };

export async function guardUser(): Promise<Guard> {
  const user = await getSessionUser();
  return user ? { user } : { error: SIGNED_OUT };
}

export async function guardManager(): Promise<Guard> {
  const user = await getSessionUser();
  if (!user) return { error: SIGNED_OUT };
  return canManageWork(user.role) ? { user } : { error: FORBIDDEN };
}

export async function guardAdmin(): Promise<Guard> {
  const user = await getSessionUser();
  if (!user) return { error: SIGNED_OUT };
  return isAdmin(user.role) ? { user } : { error: FORBIDDEN };
}
