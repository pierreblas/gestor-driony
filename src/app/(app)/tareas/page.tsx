import { Suspense } from "react";
import type { Metadata } from "next";
import { requireManager } from "@/lib/auth/session";
import { isTaskPriority, isTaskStatus } from "@/lib/constants";
import { getTasks, getTeamOptions, getUserOptions, type TaskFilters as Filters } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { isAiConfigured } from "@/lib/ai";
import { CopilotButton } from "@/components/copilot/Copilot";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskTable } from "@/components/tasks/TaskTable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tareas" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TareasPage({ searchParams }: PageProps<"/tareas">) {
  await requireManager();
  const sp = await searchParams;
  const q = first(sp.q)?.trim();
  const estado = first(sp.estado);
  const prioridad = first(sp.prioridad);

  const filters: Filters = {
    q: q || undefined,
    status: estado && isTaskStatus(estado) ? estado : undefined,
    priority: prioridad && isTaskPriority(prioridad) ? prioridad : undefined,
    teamId: first(sp.equipo) || undefined,
    assigneeId: first(sp.responsable) || undefined,
  };
  const view = first(sp.vista) === "tablero" ? "tablero" : "tabla";

  const [tasks, teams, users, aiReady] = await Promise.all([
    getTasks(filters),
    getTeamOptions(),
    getUserOptions(true),
    isAiConfigured(),
  ]);

  return (
    <>
      <PageHeader
        title="Tareas"
        description="Todo el trabajo de los equipos en un solo lugar. Filtra, cambia estados y asigna responsables."
        action={
          <>
            <CopilotButton teams={teams} users={users} aiReady={aiReady} />
            <TaskFormDialog teams={teams} users={users} />
          </>
        }
      />

      <Suspense fallback={null}>
        <TaskFilters teams={teams} users={users} total={tasks.length} />
      </Suspense>

      {view === "tablero" ? (
        <TaskBoard tasks={tasks} teams={teams} users={users} />
      ) : (
        <TaskTable tasks={tasks} teams={teams} users={users} />
      )}
    </>
  );
}
