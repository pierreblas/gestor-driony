"use client";

import { useCallback, useState, useTransition } from "react";
import { Mail, Pencil, ShieldCheck, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import { deleteUser, sendAccessLink, setUserActive } from "@/lib/actions/users";
import { isUserRole } from "@/lib/constants";
import type { TeamOption, UserWithDetails } from "@/lib/queries";
import { summarizeTasks } from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import { Avatar, TeamDot } from "@/components/ui/Avatar";
import { Badge, RoleBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { confirmAction, toastResult } from "@/lib/feedback";
import { Modal } from "@/components/ui/Modal";
import { ShareLink } from "./ShareLink";
import { UserForm } from "./UserForm";

export function UserTable({
  users,
  teams,
  meId,
  emailReady,
}: {
  users: UserWithDetails[];
  teams: TeamOption[];
  meId: string;
  emailReady: boolean;
}) {
  const [editing, setEditing] = useState<UserWithDetails | null>(null);
  const [share, setShare] = useState<{ message: string; link: string } | null>(null);
  const [, startTransition] = useTransition();
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeShare = useCallback(() => setShare(null), []);

  function sendAccess(user: UserWithDetails) {
    startTransition(async () => {
      const result = await sendAccessLink(user.id);
      if (result?.ok && result.link) setShare({ message: result.message ?? "", link: result.link });
      else toastResult(result);
    });
  }

  function toggleActive(user: UserWithDetails) {
    startTransition(async () => {
      toastResult(await setUserActive(user.id, !user.active));
    });
  }

  async function remove(user: UserWithDetails) {
    const open = user.tasks.filter((t) => t.status !== "COMPLETADA").length;
    const ok = await confirmAction({
      title: `¿Eliminar a ${user.name}?`,
      message:
        (open > 0 ? `Sus ${open} tareas en curso quedarán sin responsable. ` : "") +
        "Si solo se ausenta un tiempo, mejor desactiva su cuenta: así se guarda su historial.",
      confirmLabel: "Eliminar persona",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      toastResult(await deleteUser(user.id));
    });
  }

  if (users.length === 0) {
    return (
      <div className="card">
        <EmptyState title="Todavía no hay usuarios" description="Crea el primero para empezar a asignar tareas." />
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-[14px]">
          <thead>
            <tr className="text-left text-[12.5px] text-muted">
              <th className="px-5 py-3 font-medium">Persona</th>
              <th className="px-3 py-3 font-medium">Puesto</th>
              <th className="px-3 py-3 font-medium">Rol</th>
              <th className="px-3 py-3 font-medium">Equipos</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">En curso</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const summary = summarizeTasks(user.tasks);
              return (
                <tr
                  key={user.id}
                  className={cn("border-t border-line transition-colors hover:bg-surface-2/60", !user.active && "text-muted")}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} muted={!user.active} />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setEditing(user)}
                          className={cn("block truncate text-left font-medium hover:underline", user.active ? "text-ink" : "text-ink-2")}
                        >
                          {user.name}
                        </button>
                        <p className="flex items-center gap-1 truncate text-[12.5px] text-muted">
                          {user.isMaster ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Cuenta master" /> : null}
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-ink-2">{user.jobTitle ?? <span className="text-muted">Sin puesto</span>}</td>
                  <td className="px-3 py-3">{isUserRole(user.role) ? <RoleBadge role={user.role} /> : user.role}</td>
                  <td className="px-3 py-3">
                    {user.memberships.length === 0 ? (
                      <span className="text-muted">Sin equipo</span>
                    ) : (
                      <ul className="flex flex-wrap gap-x-3 gap-y-1">
                        {user.memberships.map((m) => (
                          <li key={m.id} className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-2">
                            <TeamDot slot={m.team.colorSlot} />
                            {m.team.name}
                            {user.ledTeams.some((t) => t.id === m.teamId) ? (
                              <span className="text-[11.5px] text-accent-strong">responsable</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="tabular font-medium text-ink">{summary.open}</span>
                    {summary.overdue > 0 ? (
                      <span className="ml-1.5 whitespace-nowrap text-[12.5px] text-critical-ink">{summary.overdue} con retraso</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    {!user.active ? (
                      <Badge tone="neutral">Desactivada</Badge>
                    ) : user.activated ? (
                      <Badge tone="good">Activa</Badge>
                    ) : (
                      <Badge tone="warning">Sin activar</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Editar"
                        aria-label={`Editar a ${user.name}`}
                        onClick={() => setEditing(user)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      {user.active ? (
                        <button
                          type="button"
                          className="icon-btn"
                          title={
                            user.activated
                              ? emailReady
                                ? "Enviar enlace para cambiar la contraseña"
                                : "Crear enlace para cambiar la contraseña"
                              : emailReady
                                ? "Reenviar correo de activación"
                                : "Crear enlace de activación"
                          }
                          aria-label={`Enviar acceso a ${user.name}`}
                          onClick={() => sendAccess(user)}
                        >
                          <Mail className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={user.isMaster || user.id === meId}
                        title={user.active ? "Desactivar" : "Reactivar"}
                        aria-label={`${user.active ? "Desactivar" : "Reactivar"} a ${user.name}`}
                        onClick={() => toggleActive(user)}
                      >
                        {user.active ? (
                          <UserRoundX className="h-4 w-4" aria-hidden />
                        ) : (
                          <UserRoundCheck className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        className="icon-btn hover:text-critical-ink"
                        disabled={user.isMaster || user.id === meId}
                        title="Eliminar"
                        aria-label={`Eliminar a ${user.name}`}
                        onClick={() => remove(user)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={share !== null} onClose={closeShare} title="Enlace de acceso">
        {share ? <ShareLink message={share.message} link={share.link} onDone={closeShare} /> : null}
      </Modal>

      <Modal open={editing !== null} onClose={closeEdit} title="Editar persona">
        {editing ? (
          <UserForm
            user={{
              id: editing.id,
              name: editing.name,
              email: editing.email,
              role: editing.role,
              jobTitle: editing.jobTitle,
              active: editing.active,
              teamIds: editing.memberships.map((m) => m.teamId),
            }}
            teams={teams}
            lockedMaster={editing.isMaster}
            onSuccess={closeEdit}
          />
        ) : null}
      </Modal>
    </>
  );
}
