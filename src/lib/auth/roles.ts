import type { UserRole } from "@/lib/constants";

export function masterEmail() {
  return (process.env.MASTER_EMAIL ?? "").trim().toLowerCase();
}

export function isMasterEmail(email: string | null | undefined) {
  const master = masterEmail();
  return Boolean(master) && (email ?? "").trim().toLowerCase() === master;
}

/** ADMIN: everything. GESTOR: dashboard, all tasks, teams. MIEMBRO: only their own tasks. */
export function canManageWork(role: string) {
  return role === "ADMIN" || role === "GESTOR";
}

export function isAdmin(role: string) {
  return role === "ADMIN";
}

export type Role = UserRole;
