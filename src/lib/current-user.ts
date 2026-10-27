import { getSessionUser, type SessionUser } from "./auth/session";

/** The signed-in person (kept for older imports). */
export const getCurrentUser = getSessionUser;
export type CurrentUser = SessionUser;

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}
