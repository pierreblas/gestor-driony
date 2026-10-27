import Link from "next/link";
import type { Metadata } from "next";
import { requireManager } from "@/lib/auth/session";
import { getTeams, getUserOptions, summarizeTasks } from "@/lib/queries";
import { pluralize } from "@/lib/utils";
import { Avatar, TeamDot } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamFormDialog } from "@/components/teams/TeamFormDialog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Equipos" };

export default async function EquiposPage() {
  await requireManager();
  const [teams, users] = await Promise.all([getTeams(), getUserOptions(true)]);

  return (
    <>
      <PageHeader
        title="Equipos"
        description="Agrupa a las personas por área y sigue el avance de sus tareas."
        action={<TeamFormDialog users={users} />}
      />

      {teams.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Todavía no hay equipos"
            description="Crea el primer equipo para empezar a organizar el trabajo."
            action={<TeamFormDialog users={users} label="Crear el primer equipo" />}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const summary = summarizeTasks(team.tasks);
            const pct = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
            const shown = team.members.slice(0, 5);
            const extra = team.members.length - shown.length;
            return (
              <Link
                key={team.id}
                href={`/equipos/${team.id}`}
                className="card group flex flex-col gap-4 p-5 transition-colors hover:border-line-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TeamDot slot={team.colorSlot} className="h-3 w-3" />
                    <h2 className="truncate font-display text-[21px] font-semibold tracking-tight text-ink group-hover:underline">
                      {team.name}
                    </h2>
                  </div>
                  <span className="shrink-0 text-[13px] text-muted">
                    {team.members.length} {pluralize(team.members.length, "miembro", "miembros")}
                  </span>
                </div>

                {team.description ? (
                  <p className="line-clamp-2 text-[14px] leading-snug text-ink-2">{team.description}</p>
                ) : null}

                <div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-2">
                      {summary.total === 0
                        ? "Sin tareas todavía"
                        : `${summary.completed} de ${summary.total} completadas`}
                    </span>
                    {summary.total > 0 ? <span className="tabular font-medium text-ink">{pct}%</span> : null}
                  </div>
                  <div
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-accent-soft"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    aria-label="Porcentaje de tareas completadas"
                  >
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--ord-3)" }} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex -space-x-1.5">
                    {shown.map((m) => (
                      <Avatar key={m.id} name={m.user.name} size="sm" muted={!m.user.active} className="ring-2 ring-surface" />
                    ))}
                    {extra > 0 ? (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold text-ink-2 ring-2 ring-surface">
                        +{extra}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-right text-[13px] text-ink-2">
                    {summary.open} en curso
                    {summary.overdue > 0 ? <span className="text-critical-ink">, {summary.overdue} con retraso</span> : null}
                  </p>
                </div>

                <p className="text-[13px] text-muted">
                  {team.lead ? `Responsable: ${team.lead.name}` : "Sin responsable asignado"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
