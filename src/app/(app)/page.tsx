import Link from "next/link";
import { requireManager } from "@/lib/auth/session";
import { getDashboardData, getTeamOptions, getUserOptions, type DashboardData } from "@/lib/queries";
import { formatLongDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DeadlinesList } from "@/components/dashboard/DeadlinesList";
import { TeamStatusChart } from "@/components/dashboard/TeamStatusChart";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { WorkloadBars } from "@/components/dashboard/WorkloadBars";

export const dynamic = "force-dynamic";

function headline(t: DashboardData["totals"]) {
  if (t.total === 0) return "Todavía no hay tareas. Crea la primera para empezar.";
  if (t.active === 0) return "No queda ninguna tarea en curso. Buen trabajo.";

  const parts = [`${t.active} ${t.active === 1 ? "tarea" : "tareas"} en curso`];
  if (t.dueToday > 0) parts.push(`${t.dueToday} ${t.dueToday === 1 ? "vence" : "vencen"} hoy`);
  if (t.overdue > 0) parts.push(`${t.overdue} ${t.overdue === 1 ? "va" : "van"} con retraso`);

  if (parts.length === 1) return `${parts[0]} y ninguna con retraso.`;
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}.`;
  return `${parts[0]}, ${parts[1]} y ${parts[2]}.`;
}

export default async function DashboardPage() {
  await requireManager();
  const [data, teams, users] = await Promise.all([getDashboardData(), getTeamOptions(), getUserOptions(true)]);
  const { totals } = data;

  return (
    <>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink-2">{formatLongDate(data.now)}</p>
          <h1 className="mt-1 max-w-3xl font-display text-[30px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[36px]">
            {headline(totals)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/mis-tareas">
            <Button variant="secondary">Ver mis tareas</Button>
          </Link>
          <TaskFormDialog teams={teams} users={users} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Tareas en curso"
          value={totals.active}
          note={
            totals.active === 0
              ? "Nada pendiente"
              : totals.unassigned > 0
                ? `${totals.unassigned} sin responsable`
                : "Todas tienen responsable"
          }
        />
        <StatTile
          label="Vencen hoy"
          value={totals.dueToday}
          tone={totals.dueToday > 0 ? "warning" : "default"}
          note={totals.dueToday > 0 ? "Conviene revisarlas primero" : "Ninguna tarea vence hoy"}
        />
        <StatTile
          label="Con retraso"
          value={totals.overdue}
          tone={totals.overdue > 0 ? "critical" : "good"}
          note={totals.overdue > 0 ? `de ${totals.active} en curso` : "Todo va al día"}
        />
        <StatTile
          label="Completadas este mes"
          value={totals.completedThisMonth}
          note={`${totals.total} ${totals.total === 1 ? "tarea" : "tareas"} en total`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader title="Tareas por equipo" subtitle="Todas las tareas de cada equipo, según su estado" />
          <TeamStatusChart rows={data.byTeam} />
        </Card>
        <Card>
          <CardHeader title="Ritmo semanal" subtitle="Tareas creadas y completadas en las últimas 8 semanas" />
          <WeeklyChart data={data.weekly} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Carga por persona" subtitle="Tareas en curso asignadas a cada persona" />
          <WorkloadBars rows={data.workload} />
        </Card>
        <Card>
          <CardHeader
            title="Fechas límite"
            subtitle="Con retraso y en los próximos 7 días"
            action={
              <Link href="/tareas" className="text-[13px] font-medium text-accent-strong hover:underline">
                Ver todas
              </Link>
            }
          />
          <DeadlinesList overdue={data.overdueTasks} upcoming={data.upcoming} />
        </Card>
        <Card>
          <CardHeader title="Actividad reciente" subtitle="Últimos cambios en el espacio de trabajo" />
          <ActivityFeed items={data.activity} />
        </Card>
      </div>
    </>
  );
}
