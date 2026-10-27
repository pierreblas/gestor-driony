export const TASK_STATUSES = [
  "PENDIENTE",
  "EN_PROGRESO",
  "EN_REVISION",
  "COMPLETADA",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["BAJA", "MEDIA", "ALTA", "URGENTE"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const USER_ROLES = ["ADMIN", "GESTOR", "MIEMBRO"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  EN_REVISION: "En revisión",
  COMPLETADA: "Completada",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  MIEMBRO: "Miembro",
};

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  ADMIN: "Gestiona usuarios, equipos y toda la configuración.",
  GESTOR: "Lidera equipos y asigna tareas.",
  MIEMBRO: "Trabaja en las tareas que tiene asignadas.",
};

/** Ordinal blue ramp (validated): progress reads as light -> dark. */
export const STATUS_CHART_VAR: Record<TaskStatus, string> = {
  PENDIENTE: "var(--ord-1)",
  EN_PROGRESO: "var(--ord-2)",
  EN_REVISION: "var(--ord-3)",
  COMPLETADA: "var(--ord-4)",
};

/** Categorical slots available for team identity (validated order). */
export const TEAM_COLOR_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const TEAM_COLOR_NAMES: Record<number, string> = {
  1: "Azul",
  2: "Naranja",
  3: "Verde agua",
  4: "Amarillo",
  5: "Magenta",
  6: "Verde",
  7: "Violeta",
  8: "Rojo",
};

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}
export function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}
export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}
