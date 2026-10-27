"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isTaskStatus, STATUS_LABEL } from "@/lib/constants";
import { parseDateInput } from "@/lib/utils";
import { taskSchema, type ActionState } from "@/lib/validation";
import { canManageWork } from "@/lib/auth/roles";
import { errorMessage, getActor, guardUser, revalidateAll, str } from "./helpers";

const NOT_YOURS: ActionState = { ok: false, message: "Solo puedes cambiar tus propias tareas." };

export async function saveTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await guardUser();
  if (guard.error) return guard.error;
  const me = guard.user;
  const manager = canManageWork(me.role);

  const parsed = taskSchema.safeParse({
    id: str(formData, "id") || undefined,
    title: str(formData, "title"),
    description: str(formData, "description"),
    status: str(formData, "status"),
    priority: str(formData, "priority"),
    teamId: str(formData, "teamId"),
    assigneeId: str(formData, "assigneeId"),
    dueDate: str(formData, "dueDate"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  // Members only create and edit their own tasks, inside their own teams.
  if (!manager) {
    data.assigneeId = me.id;
    if (!me.teamIds.includes(data.teamId)) {
      return { ok: false, message: "Elige uno de tus equipos.", fieldErrors: { teamId: ["Elige uno de tus equipos"] } };
    }
  }
  const dueDate = parseDateInput(data.dueDate);
  if (data.dueDate && !dueDate) {
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { dueDate: ["Fecha no válida"] } };
  }

  try {
    const actor = await getActor();
    const who = actor ? `${actor.name} ` : "";
    const team = await prisma.team.findUnique({ where: { id: data.teamId }, select: { id: true, name: true } });
    if (!team) {
      return { ok: false, message: "El equipo seleccionado ya no existe.", fieldErrors: { teamId: ["Elige un equipo válido"] } };
    }

    let assigneeName: string | null = null;
    if (data.assigneeId) {
      const user = await prisma.user.findUnique({ where: { id: data.assigneeId }, select: { name: true } });
      if (!user) {
        return { ok: false, message: "El responsable seleccionado ya no existe.", fieldErrors: { assigneeId: ["Elige una persona válida"] } };
      }
      assigneeName = user.name;
    }

    if (data.id) {
      const existing = await prisma.task.findUnique({ where: { id: data.id } });
      if (!existing) return { ok: false, message: "La tarea ya no existe." };
      if (!manager && existing.assigneeId !== me.id) return NOT_YOURS;

      const completedAt =
        data.status === "COMPLETADA" ? (existing.completedAt ?? new Date()) : null;

      const task = await prisma.task.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          teamId: data.teamId,
          assigneeId: data.assigneeId,
          dueDate,
          completedAt,
        },
      });

      const events: { type: string; message: string; userId?: string | null }[] = [];
      if (existing.status !== data.status) {
        events.push({
          type: data.status === "COMPLETADA" ? "TAREA_COMPLETADA" : "ESTADO_CAMBIADO",
          message: actor
            ? `${actor.name} movió «${task.title}» a ${STATUS_LABEL[data.status]}`
            : `«${task.title}» pasó a ${STATUS_LABEL[data.status]}`,
          userId: actor?.id ?? data.assigneeId,
        });
      }
      if (existing.assigneeId !== data.assigneeId) {
        events.push({
          type: "TAREA_ASIGNADA",
          message: assigneeName
            ? `«${task.title}» se asignó a ${assigneeName}`
            : `«${task.title}» quedó sin responsable`,
          userId: data.assigneeId,
        });
      }
      if (events.length === 0) {
        events.push({
          type: "TAREA_ACTUALIZADA",
          message: `${who}${actor ? "actualizó" : "Se actualizó"} «${task.title}»`,
          userId: actor?.id ?? data.assigneeId,
        });
      }
      await prisma.$transaction(
        events.map((e) =>
          prisma.activity.create({ data: { type: e.type, message: e.message, taskId: task.id, userId: e.userId ?? null } }),
        ),
      );

      revalidateAll();
      return { ok: true, message: "Cambios guardados" };
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        teamId: data.teamId,
        assigneeId: data.assigneeId,
        dueDate,
        completedAt: data.status === "COMPLETADA" ? new Date() : null,
      },
    });

    const events = [
      prisma.activity.create({
        data: {
          type: "TAREA_CREADA",
          message: actor ? `${actor.name} creó «${task.title}» en ${team.name}` : `Nueva tarea «${task.title}» en ${team.name}`,
          taskId: task.id,
          userId: actor?.id ?? data.assigneeId,
        },
      }),
    ];
    if (assigneeName) {
      events.push(
        prisma.activity.create({
          data: { type: "TAREA_ASIGNADA", message: `«${task.title}» se asignó a ${assigneeName}`, taskId: task.id, userId: data.assigneeId },
        }),
      );
    }
    await prisma.$transaction(events);

    revalidateAll();
    return { ok: true, message: "Tarea creada" };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo guardar la tarea.") };
  }
}

export async function updateTaskStatus(id: string, status: string): Promise<ActionState> {
  if (!isTaskStatus(status)) return { ok: false, message: "Estado no válido." };
  const guard = await guardUser();
  if (guard.error) return guard.error;
  try {
    const existing = await prisma.task.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, completedAt: true, assigneeId: true },
    });
    if (!existing) return { ok: false, message: "La tarea ya no existe." };
    if (!canManageWork(guard.user.role) && existing.assigneeId !== guard.user.id) return NOT_YOURS;
    if (existing.status === status) return { ok: true };
    const actor = await getActor();

    await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETADA" ? (existing.completedAt ?? new Date()) : null,
      },
    });
    const message =
      status === "COMPLETADA"
        ? actor
          ? `${actor.name} completó «${existing.title}»`
          : `«${existing.title}» se completó`
        : actor
          ? `${actor.name} movió «${existing.title}» a ${STATUS_LABEL[status]}`
          : `«${existing.title}» pasó a ${STATUS_LABEL[status]}`;
    await prisma.activity.create({
      data: {
        type: status === "COMPLETADA" ? "TAREA_COMPLETADA" : "ESTADO_CAMBIADO",
        message,
        taskId: id,
        userId: actor?.id ?? existing.assigneeId,
      },
    });
    revalidateAll();
    return { ok: true, message: `Movida a ${STATUS_LABEL[status]}` };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo cambiar el estado.") };
  }
}

/** Assign a task to someone (or nobody with null). Used by "Me la quedo". */
export async function assignTask(id: string, userId: string | null): Promise<ActionState> {
  const guard = await guardUser();
  if (guard.error) return guard.error;
  const me = guard.user;
  try {
    const task = await prisma.task.findUnique({ where: { id }, select: { title: true, assigneeId: true, teamId: true } });
    if (!task) return { ok: false, message: "La tarea ya no existe." };
    if (!canManageWork(me.role)) {
      // Members can only take unassigned work from their own teams.
      const allowed = userId === me.id && task.assigneeId === null && me.teamIds.includes(task.teamId);
      if (!allowed) return { ok: false, message: "Solo puedes quedarte con tareas sin responsable de tus equipos." };
    }
    let name: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, active: true } });
      if (!user || !user.active) return { ok: false, message: "Esa persona ya no está activa." };
      name = user.name;
    }
    await prisma.task.update({ where: { id }, data: { assigneeId: userId } });
    await prisma.activity.create({
      data: {
        type: "TAREA_ASIGNADA",
        message: name ? `«${task.title}» se asignó a ${name}` : `«${task.title}» quedó sin responsable`,
        taskId: id,
        userId,
      },
    });
    revalidateAll();
    return { ok: true, message: name ? `Asignada a ${name}` : "Tarea sin responsable" };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo asignar la tarea.") };
  }
}

export async function deleteTask(id: string): Promise<ActionState> {
  const guard = await guardUser();
  if (guard.error) return guard.error;
  try {
    const existing = await prisma.task.findUnique({
      where: { id },
      select: { title: true, assigneeId: true, team: { select: { name: true } } },
    });
    if (!existing) return { ok: false, message: "La tarea ya no existe." };
    if (!canManageWork(guard.user.role) && existing.assigneeId !== guard.user.id) return NOT_YOURS;
    await prisma.task.delete({ where: { id } });
    await prisma.activity.create({
      data: { type: "TAREA_ELIMINADA", message: `Se eliminó «${existing.title}» de ${existing.team.name}` },
    });
    revalidateAll();
    return { ok: true, message: "Tarea eliminada" };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo eliminar la tarea.") };
  }
}
