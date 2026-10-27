import type { Metadata } from "next";
import { endOfDay, startOfDay } from "date-fns";
import { requireUser } from "@/lib/auth/session";
import { canManageWork } from "@/lib/auth/roles";
import { firstName } from "@/lib/current-user";
import { getMyTasks, getTeamOptions, getUserOptions } from "@/lib/queries";
import { isAiConfigured } from "@/lib/ai";
import { CopilotButton } from "@/components/copilot/Copilot";
import { formatLongDate } from "@/lib/utils";
import { MyTasks } from "@/components/my/MyTasks";
import { QuickAdd } from "@/components/my/QuickAdd";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis tareas" };

function summary(today: number, overdue: number) {
  if (today === 0 && overdue === 0) return "Nada urgente por hoy.";
  const parts: string[] = [];
  if (today > 0) parts.push(`${today} ${today === 1 ? "tarea" : "tareas"} para hoy`);
  if (overdue > 0) parts.push(`${overdue} con retraso`);
  return `Tienes ${parts.join(" y ")}.`;
}

export default async function MisTareasPage() {
  const me = await requireUser();
  const manager = canManageWork(me.role);

  const [tasks, allTeams, allUsers, aiReady] = await Promise.all([
    getMyTasks(me.id, me.teamIds),
    getTeamOptions(),
    getUserOptions(true),
    isAiConfigured(),
  ]);

  // Members only see their own teams and can only assign to themselves.
  const myTeams = allTeams.filter((t) => me.teamIds.includes(t.id));
  const formTeams = manager ? allTeams : myTeams;
  const formUsers = manager ? allUsers : allUsers.filter((u) => u.id === me.id);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const open = tasks.filter((t) => t.assigneeId === me.id && t.status !== "COMPLETADA");
  const dueToday = open.filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= todayEnd).length;
  const overdue = open.filter((t) => t.dueDate && t.dueDate < todayStart).length;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[14px] font-medium text-ink-2">{formatLongDate(now)}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1
          data-tour="nav-mis-tareas"
          className="font-display text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[36px]"
        >
          Hola, {firstName(me.name)}
        </h1>
        <CopilotButton teams={manager ? allTeams : myTeams} users={formUsers} aiReady={aiReady} />
      </div>
      <p className="mt-1.5 text-[16px] text-ink-2">{summary(dueToday, overdue)}</p>

      <div className="mb-6 mt-6">
        <QuickAdd meId={me.id} teams={myTeams.length > 0 ? myTeams : manager ? allTeams : []} />
      </div>

      <MyTasks tasks={tasks} meId={me.id} teams={formTeams} users={formUsers} />
    </div>
  );
}
