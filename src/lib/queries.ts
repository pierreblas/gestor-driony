import { Prisma } from "@prisma/client";
import {
  addDays,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "./prisma";
import { isMasterEmail } from "./auth/roles";
import type { TaskPriority, TaskStatus } from "./constants";
import { sortTasks, summarizeTasks } from "./task-utils";

export { sortTasks, summarizeTasks };
export type { TaskSummary } from "./task-utils";

/* ---------- Tasks ---------- */

export const taskInclude = {
  team: { select: { id: true, name: true, colorSlot: true } },
  assignee: { select: { id: true, name: true, email: true, active: true } },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export type TaskFilters = {
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  teamId?: string;
  /** "none" selects unassigned tasks. */
  assigneeId?: string;
};

export async function getTasks(filters: TaskFilters = {}): Promise<TaskWithRelations[]> {
  const where: Prisma.TaskWhereInput = {};
  if (filters.q) where.title = { contains: filters.q };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.teamId) where.teamId = filters.teamId;
  if (filters.assigneeId === "none") where.assigneeId = null;
  else if (filters.assigneeId) where.assigneeId = filters.assigneeId;

  const tasks = await prisma.task.findMany({ where, include: taskInclude });
  return sortTasks(tasks);
}

/* ---------- Options for selects ---------- */

export async function getTeamOptions() {
  return prisma.team.findMany({
    select: { id: true, name: true, colorSlot: true },
    orderBy: { name: "asc" },
  });
}
export type TeamOption = Awaited<ReturnType<typeof getTeamOptions>>[number];

export async function getUserOptions(includeInactive = false) {
  return prisma.user.findMany({
    where: includeInactive ? undefined : { active: true },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });
}
export type UserOption = Awaited<ReturnType<typeof getUserOptions>>[number];

/* ---------- Teams ---------- */

const memberInclude = {
  user: {
    select: { id: true, name: true, email: true, role: true, jobTitle: true, active: true },
  },
} satisfies Prisma.TeamMemberInclude;

export const teamInclude = {
  lead: { select: { id: true, name: true } },
  members: { include: memberInclude, orderBy: { joinedAt: "asc" } },
  tasks: { select: { id: true, status: true, dueDate: true } },
} satisfies Prisma.TeamInclude;

export type TeamWithDetails = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

export async function getTeams(): Promise<TeamWithDetails[]> {
  return prisma.team.findMany({ include: teamInclude, orderBy: { name: "asc" } });
}

export async function getTeamById(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, name: true } },
      members: { include: memberInclude, orderBy: { joinedAt: "asc" } },
      tasks: { include: taskInclude },
    },
  });
  if (!team) return null;
  return { ...team, tasks: sortTasks(team.tasks) };
}
export type TeamDetail = NonNullable<Awaited<ReturnType<typeof getTeamById>>>;

/* ---------- Users ---------- */

export const userInclude = {
  memberships: {
    include: { team: { select: { id: true, name: true, colorSlot: true } } },
    orderBy: { joinedAt: "asc" },
  },
  tasks: { select: { id: true, status: true, dueDate: true } },
  ledTeams: { select: { id: true, name: true } },
} satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>;
export type UserWithDetails = Omit<UserRow, "passwordHash"> & { activated: boolean; isMaster: boolean };

export async function getUsers(): Promise<UserWithDetails[]> {
  const rows = await prisma.user.findMany({
    include: userInclude,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  // Strip the password hash: this list is sent to the browser.
  return rows.map(({ passwordHash, ...user }) => ({
    ...user,
    activated: Boolean(passwordHash),
    isMaster: isMasterEmail(user.email),
  }));
}

/* ---------- Dashboard ---------- */

export type TeamStatusRow = {
  teamId: string;
  name: string;
  colorSlot: number;
  total: number;
  byStatus: Record<TaskStatus, number>;
};

export type WeeklyPoint = {
  label: string;
  weekStart: string;
  creadas: number;
  completadas: number;
};

export type WorkloadRow = {
  userId: string;
  name: string;
  open: number;
  overdue: number;
};

export type ActivityItem = Prisma.ActivityGetPayload<{
  include: { user: { select: { name: true } }; task: { select: { id: true; title: true } } };
}>;

export async function getDashboardData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const horizon = endOfDay(addDays(now, 7));
  const firstWeek = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });

  const [tasks, users, teams, activity] = await Promise.all([
    prisma.task.findMany({ include: taskInclude }),
    prisma.user.findMany({ select: { id: true, name: true, active: true } }),
    prisma.team.findMany({ select: { id: true, name: true, colorSlot: true }, orderBy: { name: "asc" } }),
    prisma.activity.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } }, task: { select: { id: true, title: true } } },
    }),
  ]);

  const open = tasks.filter((t) => t.status !== "COMPLETADA");
  const overdueTasks = sortTasks(open.filter((t) => t.dueDate && t.dueDate < todayStart));
  const dueToday = open.filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= todayEnd);
  const completedThisMonth = tasks.filter((t) => t.completedAt && t.completedAt >= monthStart);
  const unassigned = open.filter((t) => !t.assigneeId);
  const activeUsers = users.filter((u) => u.active);

  const byTeam: TeamStatusRow[] = teams
    .map((team) => {
      const teamTasks = tasks.filter((t) => t.teamId === team.id);
      const summary = summarizeTasks(teamTasks, now);
      return { teamId: team.id, name: team.name, colorSlot: team.colorSlot, total: summary.total, byStatus: summary.byStatus };
    })
    .sort((a, b) => b.total - a.total);

  const weekly: WeeklyPoint[] = [];
  for (let i = 0; i < 8; i += 1) {
    const start = addDays(firstWeek, i * 7);
    const end = addDays(start, 7);
    weekly.push({
      label: format(start, "d MMM", { locale: es }),
      weekStart: start.toISOString(),
      creadas: tasks.filter((t) => t.createdAt >= start && t.createdAt < end).length,
      completadas: tasks.filter((t) => t.completedAt && t.completedAt >= start && t.completedAt < end).length,
    });
  }

  const workload: WorkloadRow[] = activeUsers
    .map((u) => {
      const mine = open.filter((t) => t.assigneeId === u.id);
      return {
        userId: u.id,
        name: u.name,
        open: mine.length,
        overdue: mine.filter((t) => t.dueDate && t.dueDate < todayStart).length,
      };
    })
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))
    .slice(0, 8);

  const upcoming = sortTasks(
    open.filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= horizon),
  ).slice(0, 7);

  return {
    now,
    totals: {
      active: open.length,
      completedThisMonth: completedThisMonth.length,
      overdue: overdueTasks.length,
      dueToday: dueToday.length,
      unassigned: unassigned.length,
      activeUsers: activeUsers.length,
      teams: teams.length,
      total: tasks.length,
    },
    byTeam,
    weekly,
    workload,
    upcoming,
    overdueTasks: overdueTasks.slice(0, 6),
    activity: activity as ActivityItem[],
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

/* ---------- My tasks ---------- */

/** My open tasks, what I finished in the last 7 days, and unassigned work in my teams. */
export async function getMyTasks(userId: string, teamIds: string[]) {
  const weekAgo = addDays(startOfDay(new Date()), -7);
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: userId, status: { not: "COMPLETADA" } },
        { assigneeId: userId, completedAt: { gte: weekAgo } },
        { assigneeId: null, status: { not: "COMPLETADA" }, teamId: { in: teamIds } },
      ],
    },
    include: taskInclude,
  });
  return sortTasks(tasks);
}

export async function getPeopleToPick() {
  return prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, jobTitle: true },
    orderBy: { name: "asc" },
  });
}
export type PersonToPick = Awaited<ReturnType<typeof getPeopleToPick>>[number];
