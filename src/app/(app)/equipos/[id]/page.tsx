import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireManager } from "@/lib/auth/session";
import { ArrowLeft } from "lucide-react";
import { getTeamById, getTeamOptions, getUserOptions, summarizeTasks } from "@/lib/queries";
import { pluralize } from "@/lib/utils";
import { TeamDot } from "@/components/ui/Avatar";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { isAiConfigured } from "@/lib/ai";
import { CopilotButton } from "@/components/copilot/Copilot";
import { StatTile } from "@/components/ui/StatTile";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskTable } from "@/components/tasks/TaskTable";
import { DeleteTeamButton } from "@/components/teams/DeleteTeamButton";
import { MemberManager } from "@/components/teams/MemberManager";
import { TeamFormDialog } from "@/components/teams/TeamFormDialog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/equipos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const team = await getTeamById(id);
  return { title: team ? team.name : "Equipo" };
}

export default async function EquipoPage({ params }: PageProps<"/equipos/[id]">) {
  await requireManager();
  const { id } = await params;
  const [team, users, teams, aiReady] = await Promise.all([
    getTeamById(id),
    getUserOptions(true),
    getTeamOptions(),
    isAiConfigured(),
  ]);
  if (!team) notFound();

  const summary = summarizeTasks(team.tasks);

  return (
    <>
      <Link
        href="/equipos"
        className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Equipos
      </Link>

      <PageHeader
        title={
          <>
            <TeamDot slot={team.colorSlot} className="h-3.5 w-3.5" />
            <span className="truncate">{team.name}</span>
          </>
        }
        description={
          team.description ??
          `${team.members.length} ${pluralize(team.members.length, "miembro", "miembros")}, ${summary.open} ${pluralize(summary.open, "tarea", "tareas")} en curso.`
        }
        action={
          <>
            <CopilotButton teams={teams} users={users} aiReady={aiReady} defaultTeamId={team.id} />
            <TaskFormDialog teams={teams} users={users} defaultTeamId={team.id} />
            <TeamFormDialog
              users={users}
              variant="secondary"
              label="Editar"
              team={{
                id: team.id,
                name: team.name,
                description: team.description,
                colorSlot: team.colorSlot,
                leadId: team.leadId,
                memberIds: team.members.map((m) => m.userId),
              }}
            />
            <DeleteTeamButton teamId={team.id} teamName={team.name} taskCount={team.tasks.length} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="En curso" value={summary.open} note={`${summary.total} en total`} />
        <StatTile
          label="Con retraso"
          value={summary.overdue}
          tone={summary.overdue > 0 ? "critical" : "good"}
          note={summary.overdue > 0 ? "Fecha límite superada" : "Todo al día"}
        />
        <StatTile label="Completadas" value={summary.completed} note="Desde que existe el equipo" />
        <StatTile
          label="Miembros"
          value={team.members.length}
          note={team.lead ? `Responsable: ${team.lead.name}` : "Sin responsable"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_3fr]">
        <Card className="self-start">
          <CardHeader title="Miembros" subtitle="Quién forma parte del equipo" />
          <MemberManager teamId={team.id} leadId={team.leadId} members={team.members} users={users} />
        </Card>

        <div>
          <h2 className="mb-3 text-[15px] font-semibold text-ink">
            Tareas del equipo <span className="font-normal text-muted">({team.tasks.length})</span>
          </h2>
          <TaskTable
            tasks={team.tasks}
            teams={teams}
            users={users}
            emptyTitle="Este equipo aún no tiene tareas"
            emptyDescription="Crea la primera con el botón «Nueva tarea»."
          />
        </div>
      </div>
    </>
  );
}
