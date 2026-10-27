"use server";

import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { canManageWork } from "@/lib/auth/roles";
import { generateProposals, type CopilotContext } from "@/lib/ai";
import { ROLE_LABEL, isTaskPriority, isUserRole, type TaskPriority } from "@/lib/constants";
import { saveTask } from "./tasks";
import { guardUser } from "./helpers";

export type Proposal = {
  key: string;
  title: string;
  description: string | null;
  teamId: string;
  assigneeId: string | null;
  priority: TaskPriority;
  dueDate: string | null;
};

export type SuggestResult = { ok: true; message: string; proposals: Proposal[] } | { ok: false; message: string };

const MAX_REQUEST = 2000;

/**
 * Ask the copilot for task proposals. mode "describe": turn free text into tasks.
 * mode "suggest": propose useful tasks for one team. Nothing is saved.
 */
export async function copilotSuggest(input: {
  mode: "describe" | "suggest";
  text?: string;
  teamId?: string;
}): Promise<SuggestResult> {
  const guard = await guardUser();
  if (guard.error) return guard.error;
  const me = guard.user;
  const manager = canManageWork(me.role);

  const text = (input.text ?? "").trim().slice(0, MAX_REQUEST);
  if (input.mode === "describe" && text.length < 3) {
    return { ok: false, message: "Escribe qué necesitas hacer, aunque sea en pocas palabras." };
  }

  // What this person may see and assign: managers everything, members only their teams and themselves.
  const teams = await prisma.team.findMany({
    where: manager ? undefined : { id: { in: me.teamIds } },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
  if (teams.length === 0) {
    return { ok: false, message: "Para usar el copiloto necesitas formar parte de un equipo." };
  }
  const focusTeam = input.teamId ? teams.find((t) => t.id === input.teamId) : undefined;
  if (input.mode === "suggest" && !focusTeam) return { ok: false, message: "Elige un equipo para sugerir tareas." };

  const people = await prisma.user.findMany({
    where: manager ? { active: true } : { id: me.id },
    select: { id: true, name: true, jobTitle: true, memberships: { select: { team: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });
  const openTasks = await prisma.task.findMany({
    where: {
      status: { not: "COMPLETADA" },
      teamId: { in: focusTeam ? [focusTeam.id] : teams.map((t) => t.id) },
    },
    select: { title: true, team: { select: { name: true } }, assignee: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  const ctx: CopilotContext = {
    today: format(new Date(), "EEEE d 'de' MMMM 'de' yyyy (yyyy-MM-dd)", { locale: es }),
    requester: { name: me.name, role: isUserRole(me.role) ? ROLE_LABEL[me.role] : me.role },
    teams,
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      jobTitle: p.jobTitle,
      teams: p.memberships.map((m) => m.team.name),
    })),
    openTasks: openTasks.map((t) => ({ title: t.title, team: t.team.name, assignee: t.assignee?.name ?? null })),
  };

  const request =
    input.mode === "suggest"
      ? `Propón entre 4 y 6 tareas útiles y realistas para el equipo «${focusTeam!.name}» (id: ${focusTeam!.id}), pensando en su función y en el trabajo que ya tiene abierto. Que no repitan tareas existentes. Asígnalas a personas de ese equipo cuando encajen.${text ? `\nIndicaciones adicionales: ${text}` : ""}`
      : `${focusTeam ? `Si no se indica otro equipo, usa «${focusTeam.name}».\n` : ""}${text}`;

  const result = await generateProposals(ctx, request);
  if (!result.ok) return result;

  // Never trust ids or dates from the model: keep only what this person can use.
  const teamIds = new Set(teams.map((t) => t.id));
  const personIds = new Set(people.map((p) => p.id));
  const today = startOfDay(new Date());
  const seen = new Set<string>();
  const proposals: Proposal[] = [];

  for (const [i, t] of result.tasks.entries()) {
    const title = t.title.trim().slice(0, 140);
    if (title.length < 3 || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    const teamId = teamIds.has(t.teamId) ? t.teamId : (focusTeam?.id ?? teams[0].id);
    let assigneeId = t.assigneeId && personIds.has(t.assigneeId) ? t.assigneeId : null;
    if (!manager) assigneeId = me.id;
    const validDate = t.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) && new Date(`${t.dueDate}T12:00:00`) >= today;
    proposals.push({
      key: `${Date.now()}-${i}`,
      title,
      description: t.description?.trim() ? t.description.trim().slice(0, 1000) : null,
      teamId,
      assigneeId,
      priority: isTaskPriority(t.priority) ? t.priority : "MEDIA",
      dueDate: validDate ? t.dueDate : null,
    });
  }

  return {
    ok: true,
    message: result.message || (proposals.length ? "Estas son mis propuestas." : "No se me ocurren tareas para esto."),
    proposals: proposals.slice(0, 8),
  };
}

/** Create the proposals the person kept. Each one goes through saveTask, with its usual permission checks. */
export async function copilotCreate(
  proposals: Omit<Proposal, "key">[],
): Promise<{ ok: boolean; created: number; message: string }> {
  const guard = await guardUser();
  if (guard.error) return { ok: false, created: 0, message: guard.error.message };
  if (!Array.isArray(proposals) || proposals.length === 0) {
    return { ok: false, created: 0, message: "Marca al menos una tarea para crearla." };
  }

  let created = 0;
  const errors: string[] = [];
  for (const p of proposals.slice(0, 12)) {
    const fd = new FormData();
    fd.set("title", String(p.title ?? ""));
    fd.set("description", String(p.description ?? ""));
    fd.set("teamId", String(p.teamId ?? ""));
    fd.set("assigneeId", String(p.assigneeId ?? ""));
    fd.set("priority", isTaskPriority(String(p.priority)) ? String(p.priority) : "MEDIA");
    fd.set("status", "PENDIENTE");
    fd.set("dueDate", String(p.dueDate ?? ""));
    const result = await saveTask(null, fd);
    if (result?.ok) created += 1;
    else if (result) errors.push(`«${p.title}»: ${result.message}`);
  }

  if (created === 0) return { ok: false, created, message: errors[0] ?? "No se pudo crear ninguna tarea." };
  const word = created === 1 ? "tarea creada" : "tareas creadas";
  return {
    ok: true,
    created,
    message: errors.length ? `${created} ${word}. ${errors.length} no se pudieron crear.` : `${created} ${word}`,
  };
}
