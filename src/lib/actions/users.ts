"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isMasterEmail } from "@/lib/auth/roles";
import { sendPasswordLink } from "@/lib/auth/tokens";
import { userSchema, type ActionState } from "@/lib/validation";
import { errorMessage, guardAdmin, isUniqueViolation, revalidateAll, str, strList } from "./helpers";

async function syncTeams(userId: string, teamIds: string[]) {
  const current = await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  const currentIds = new Set(current.map((m) => m.teamId));
  const wanted = new Set(teamIds);

  const toRemove = [...currentIds].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !currentIds.has(id));

  await prisma.$transaction([
    ...(toRemove.length
      ? [prisma.teamMember.deleteMany({ where: { userId, teamId: { in: toRemove } } })]
      : []),
    ...toAdd.map((teamId) => prisma.teamMember.create({ data: { teamId, userId } })),
  ]);
}

export async function saveUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;
  const me = guard.user;

  // The "active" checkbox only exists when editing; a marker tells us whether to read it.
  const activeProvided = formData.has("activeProvided");
  const parsed = userSchema.safeParse({
    id: str(formData, "id") || undefined,
    name: str(formData, "name"),
    email: str(formData, "email"),
    role: str(formData, "role"),
    jobTitle: str(formData, "jobTitle"),
    active: activeProvided ? str(formData, "active") === "on" : true,
    teamIds: strList(formData, "teamIds"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;

  try {
    const validTeams = await prisma.team.findMany({ where: { id: { in: data.teamIds } }, select: { id: true } });
    if (validTeams.length !== data.teamIds.length) {
      return { ok: false, message: "Alguno de los equipos seleccionados ya no existe." };
    }

    if (data.id) {
      const existing = await prisma.user.findUnique({
        where: { id: data.id },
        select: { id: true, active: true, email: true, role: true },
      });
      if (!existing) return { ok: false, message: "La persona ya no existe." };

      if (isMasterEmail(existing.email)) {
        if (data.email !== existing.email) {
          return { ok: false, message: "El correo de la cuenta master se cambia en el archivo .env (MASTER_EMAIL).", fieldErrors: { email: ["No se puede cambiar aquí"] } };
        }
        data.role = "ADMIN";
        data.active = true;
      }
      if (existing.id === me.id) {
        if (!data.active) return { ok: false, message: "No puedes desactivar tu propia cuenta." };
        if (data.role !== "ADMIN") return { ok: false, message: "No puedes quitar el rol de administración a tu propia cuenta." };
      }

      const emailChanged = existing.email !== data.email;
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          jobTitle: data.jobTitle,
          active: data.active,
          ...(emailChanged ? { emailVerifiedAt: null } : {}),
        },
      });
      await syncTeams(user.id, data.teamIds);
      if (!data.active || emailChanged || existing.role !== data.role) {
        // Sign them out so the new access rules apply right away.
        await prisma.session.deleteMany({ where: { userId: user.id } });
      }
      await prisma.activity.create({
        data: {
          type: "USUARIO_ACTUALIZADO",
          message:
            existing.active !== data.active
              ? `${user.name} ${data.active ? "se reactivó" : "se desactivó"}`
              : `El perfil de ${user.name} se actualizó`,
          userId: user.id,
        },
      });
      revalidateAll();
      return { ok: true, message: "Cambios guardados" };
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: isMasterEmail(data.email) ? "ADMIN" : data.role,
        jobTitle: data.jobTitle,
        active: true,
        memberships: { create: data.teamIds.map((teamId) => ({ teamId })) },
      },
    });
    await prisma.activity.create({
      data: { type: "USUARIO_CREADO", message: `${user.name} se unió al espacio de trabajo`, userId: user.id },
    });

    const invite = await sendPasswordLink(user);
    revalidateAll();
    if (invite.sent) {
      return { ok: true, message: `Le enviamos a ${user.email} un correo para activar su cuenta.` };
    }
    return {
      ok: true,
      message:
        invite.reason === "not-configured"
          ? "Persona añadida. El correo no está configurado: comparte este enlace para que active su cuenta."
          : "Persona añadida, pero el correo falló. Comparte este enlace para que active su cuenta.",
      link: invite.url,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: "Ya existe una persona con ese correo.", fieldErrors: { email: ["Ese correo ya está en uso"] } };
    }
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo guardar.") };
  }
}

/** Email the person a link to activate the account or reset the password. */
export async function sendAccessLink(id: string): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, active: true, passwordHash: true },
    });
    if (!user) return { ok: false, message: "La persona ya no existe." };
    if (!user.active) return { ok: false, message: "Reactiva la cuenta antes de enviar el acceso." };

    const result = await sendPasswordLink(user);
    const what = user.passwordHash ? "cambiar su contraseña" : "activar su cuenta";
    if (result.sent) return { ok: true, message: `Enviamos a ${user.email} un enlace para ${what}.` };
    return {
      ok: true,
      message:
        result.reason === "not-configured"
          ? `El correo no está configurado. Comparte este enlace con ${user.name} para ${what}.`
          : `El correo falló. Comparte este enlace con ${user.name} para ${what}.`,
      link: result.url,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo crear el enlace.") };
  }
}

export async function setUserActive(id: string, active: boolean): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;
  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    if (!target) return { ok: false, message: "La persona ya no existe." };
    if (!active && isMasterEmail(target.email)) return { ok: false, message: "La cuenta master no se puede desactivar." };
    if (!active && id === guard.user.id) return { ok: false, message: "No puedes desactivar tu propia cuenta." };

    const user = await prisma.user.update({ where: { id }, data: { active }, select: { name: true } });
    if (!active) await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.activity.create({
      data: { type: "USUARIO_ACTUALIZADO", message: `${user.name} ${active ? "se reactivó" : "se desactivó"}`, userId: id },
    });
    revalidateAll();
    return { ok: true, message: active ? "Cuenta reactivada" : "Cuenta desactivada. Ya no puede entrar." };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo actualizar.") };
  }
}

export async function deleteUser(id: string): Promise<ActionState> {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;
  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true, _count: { select: { tasks: { where: { status: { not: "COMPLETADA" } } } } } },
    });
    if (!existing) return { ok: false, message: "La persona ya no existe." };
    if (isMasterEmail(existing.email)) return { ok: false, message: "La cuenta master no se puede eliminar." };
    if (id === guard.user.id) return { ok: false, message: "No puedes eliminar tu propia cuenta." };

    await prisma.user.delete({ where: { id } });
    await prisma.activity.create({
      data: {
        type: "USUARIO_ELIMINADO",
        message:
          existing._count.tasks > 0
            ? `Se eliminó a ${existing.name}; ${existing._count.tasks} tareas quedaron sin responsable`
            : `Se eliminó a ${existing.name}`,
      },
    });
    revalidateAll();
    return { ok: true, message: "Persona eliminada" };
  } catch (error) {
    console.error(error);
    return { ok: false, message: errorMessage(error, "No se pudo eliminar.") };
  }
}
