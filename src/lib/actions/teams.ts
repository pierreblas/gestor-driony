"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { teamSchema, type ActionState } from "@/lib/validation";
import { errorMessage, guardManager, isUniqueViolation, revalidateAll, str, strList } from "./helpers";

async function syncMembers(teamId: string, memberIds: string[]) {
  const current = await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } });
  const currentIds = new Set(current.map((m) => m.userId));
  const wanted = new Set(memberIds);

  const toRemove = [...currentIds].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !currentIds.has(id));

  await prisma.$transaction([
    ...(toRemove.length
      ? [prisma.teamMember.deleteMany({ where: { teamId, userId: { in: toRemove } } })]
      : []),
    ...toAdd.map((userId) => prisma.teamMember.create({ data: { teamId, userId } })),
  ]);
}

export async function saveTeam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await guardManager();
  if (guard.error) return guard.error;
  const parsed = teamSchema.safeParse({
    id: str(formData, "id") || undefined,
    name: str(formData, "name"),
    description: str(formData, "description"),
    colorSlot: str(formData, "colorSlot") ?? "1",
    leadId: str(formData, "leadId"),
    memberIds: strList(formData, "memberIds"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  // The lead always belongs to the team.
  const memberIds = Array.from(new Set(data.leadId ? [...data.memberIds, data.leadId] : data.memberIds));

  try {
    const validUsers = await prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true } });
    if (validUsers.length !== memberIds.length) {
      return { ok: false, message: "Alguna de las personas seleccionadas ya no existe." };
    }

    if (data.id) {
      const existing = await prisma.team.findUnique({ where: { id: data.id }, select: { id: true } });
      if (!existing) return { ok: false, message: "El equipo ya no existe." };

      await prisma.team.update({
        where: { id: data.id },
        data: { name: data.name, description: data.description, colorSlot: data.colorSlot, leadId: data.leadId },
      });
      await syncMembers(data.id, memberIds);
      await prisma.activity.create({
        data: { type: "EQUIPO_ACTUALIZADO", message: `El equipo ${data.name} se actualizó`, userId: data.leadId },
      });
      revalidateAll();
      return { ok: true, message: "Cambios guardados" };
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        colorSlot: data.colorSlot,
        leadId: data.leadId,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
    });
    await prisma.activity.create({
      data: { type: "EQUIPO_CREADO", message: `Nuevo equipo ${team.name}`, userId: data.leadId },
    });
    revalidateAll();
    return { ok: true, message: "Equipo creado" };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: "Ya existe un equipo con ese nombre.", fieldErrors: { name: ["Ya existe un equipo con ese nombre"] } };
    }
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo guardar el equipo.") };
  }
}

export async function deleteTeam(id: string): Promise<ActionState> {
  const guard = await guardManager();
  if (guard.error) return guard.error;
  try {
    const existing = await prisma.team.findUnique({ where: { id }, select: { name: true, _count: { select: { tasks: true } } } });
    if (!existing) return { ok: false, message: "El equipo ya no existe." };
    await prisma.team.delete({ where: { id } });
    await prisma.activity.create({
      data: {
        type: "EQUIPO_ELIMINADO",
        message:
          existing._count.tasks > 0
            ? `Se eliminó el equipo ${existing.name} y sus ${existing._count.tasks} tareas`
            : `Se eliminó el equipo ${existing.name}`,
      },
    });
    revalidateAll();
    return { ok: true, message: "Equipo eliminado" };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo eliminar el equipo.") };
  }
}

export async function addTeamMember(teamId: string, userId: string): Promise<ActionState> {
  const guard = await guardManager();
  if (guard.error) return guard.error;
  try {
    const [team, user] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);
    if (!team || !user) return { ok: false, message: "El equipo o la persona ya no existen." };
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId, teamId } },
      update: {},
      create: { userId, teamId },
    });
    await prisma.activity.create({
      data: { type: "MIEMBRO_AGREGADO", message: `${user.name} se unió a ${team.name}`, userId },
    });
    revalidateAll();
    return { ok: true, message: `${user.name} añadido al equipo` };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo añadir al miembro.") };
  }
}

export async function removeTeamMember(teamId: string, userId: string): Promise<ActionState> {
  const guard = await guardManager();
  if (guard.error) return guard.error;
  try {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true, leadId: true } });
    if (!team) return { ok: false, message: "El equipo ya no existe." };
    if (team.leadId === userId) {
      return { ok: false, message: "Asigna otro responsable del equipo antes de quitar a esta persona." };
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await prisma.teamMember.deleteMany({ where: { teamId, userId } });
    if (user) {
      await prisma.activity.create({
        data: { type: "MIEMBRO_RETIRADO", message: `${user.name} salió de ${team.name}`, userId },
      });
    }
    revalidateAll();
    return { ok: true, message: "Miembro retirado" };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo quitar al miembro.") };
  }
}
