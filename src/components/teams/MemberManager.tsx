"use client";

import { useState, useTransition } from "react";
import { addTeamMember, removeTeamMember } from "@/lib/actions/teams";
import { isUserRole } from "@/lib/constants";
import type { TeamDetail, UserOption } from "@/lib/queries";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { confirmAction, toastResult } from "@/lib/feedback";

export function MemberManager({
  teamId,
  leadId,
  members,
  users,
}: {
  teamId: string;
  leadId: string | null;
  members: TeamDetail["members"];
  users: UserOption[];
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  const memberIds = new Set(members.map((m) => m.userId));
  const candidates = users.filter((u) => u.active && !memberIds.has(u.id));

  function add() {
    if (!selected) return;
    startTransition(async () => {
      if (toastResult(await addTeamMember(teamId, selected))) setSelected("");
    });
  }

  async function remove(member: TeamDetail["members"][number]) {
    const ok = await confirmAction({
      title: `¿Quitar a ${member.user.name} del equipo?`,
      message: "Seguirá en el espacio de trabajo y conservará sus tareas. Puedes volver a añadirla cuando quieras.",
      confirmLabel: "Quitar del equipo",
    });
    if (!ok) return;
    startTransition(async () => {
      toastResult(await removeTeamMember(teamId, member.userId));
    });
  }

  return (
    <div>
      {members.length === 0 ? (
        <EmptyState compact title="Este equipo aún no tiene miembros" description="Añade personas desde el selector de abajo." />
      ) : (
        <ul className="divide-y divide-line">
          {members.map((member) => {
            const isLead = member.userId === leadId;
            return (
              <li key={member.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={member.user.name} muted={!member.user.active} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-[14px] font-medium text-ink">
                    <span className="truncate">{member.user.name}</span>
                    {isLead ? <span className="shrink-0 text-[12px] font-medium text-accent-strong">Responsable</span> : null}
                    {!member.user.active ? <span className="shrink-0 text-[12px] text-muted">Inactivo</span> : null}
                  </p>
                  <p className="truncate text-[12.5px] text-muted">{member.user.jobTitle ?? member.user.email}</p>
                </div>
                <div className="hidden sm:block">
                  {isUserRole(member.user.role) ? <RoleBadge role={member.user.role} /> : null}
                </div>
                {!isLead ? (
                  <Button variant="ghost" size="sm" onClick={() => remove(member)} disabled={isPending}>
                    Quitar
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-line px-5 py-4">
        {candidates.length > 0 ? (
          <div className="flex gap-2">
            <select
              aria-label="Persona a añadir"
              className="control h-10 text-[14px]"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Elige a quién añadir</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={add} disabled={!selected} loading={isPending}>
              Añadir
            </Button>
          </div>
        ) : (
          <p className="text-[13px] text-muted">Todas las personas activas ya forman parte del equipo.</p>
        )}
      </div>
    </div>
  );
}
