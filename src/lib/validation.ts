import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES, USER_ROLES } from "./constants";

const optionalText = z
  .string()
  .trim()
  .max(2000, "Demasiado largo")
  .optional()
  .transform((v) => (v ? v : null));

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : null));

export const taskSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(3, "El título necesita al menos 3 caracteres")
    .max(140, "Máximo 140 caracteres"),
  description: optionalText,
  status: z.enum(TASK_STATUSES, { error: "Estado no válido" }),
  priority: z.enum(TASK_PRIORITIES, { error: "Prioridad no válida" }),
  teamId: z.string().min(1, "Elige un equipo"),
  assigneeId: optionalId,
  dueDate: optionalId,
});

export const teamSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(2, "El nombre necesita al menos 2 caracteres")
    .max(60, "Máximo 60 caracteres"),
  description: optionalText,
  colorSlot: z.coerce.number().int().min(1).max(8),
  leadId: optionalId,
  memberIds: z.array(z.string()).default([]),
});

export const userSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(2, "El nombre necesita al menos 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  email: z.email("Escribe un correo válido").trim().toLowerCase(),
  role: z.enum(USER_ROLES, { error: "Rol no válido" }),
  jobTitle: optionalText,
  active: z.boolean().default(true),
  teamIds: z.array(z.string()).default([]),
});

export type ActionState =
  | { ok: true; message?: string; link?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> }
  | null;

export const smtpSchema = z.object({
  smtpHost: z.string().trim().min(3, "Escribe el servidor, por ejemplo smtp.gmail.com").max(200),
  smtpPort: z.coerce.number({ error: "Escribe un número" }).int().min(1, "Puerto no válido").max(65535, "Puerto no válido"),
  smtpSecure: z.boolean(),
  smtpUser: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
  smtpFromName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : null)),
  smtpFromEmail: z.email("Escribe un correo válido").trim(),
  appUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v.replace(/\/+$/, "") : null))
    .refine((v) => v === null || /^https?:\/\/\S+$/.test(v), "Debe empezar por http:// o https://"),
});
