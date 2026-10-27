import Link from "next/link";
import type { TaskWithRelations } from "@/lib/queries";
import { cn, describeDueDate, type DueTone } from "@/lib/utils";
import { TeamDot } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/Card";

const DUE_TONE: Record<DueTone, string> = {
  muted: "text-muted",
  default: "text-ink-2",
  warning: "font-medium text-warning-ink",
  critical: "font-medium text-critical-ink",
};

function Group({ title, tasks, tone }: { title: string; tasks: TaskWithRelations[]; tone?: "critical" }) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <p
        className={cn(
          "px-5 pb-1 pt-3 text-[12.5px] font-medium",
          tone === "critical" ? "text-critical-ink" : "text-muted",
        )}
      >
        {title}
      </p>
      <ul className="divide-y divide-line">
        {tasks.map((task) => {
          const due = describeDueDate(task.dueDate);
          return (
            <li key={task.id} className="flex items-center gap-3 px-5 py-2.5">
              <TeamDot slot={task.team.colorSlot} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{task.title}</p>
                <p className="truncate text-[12.5px] text-muted">
                  <Link href={`/equipos/${task.team.id}`} className="hover:underline">
                    {task.team.name}
                  </Link>
                  {task.assignee ? `, ${task.assignee.name}` : ", sin asignar"}
                </p>
              </div>
              <span className={cn("shrink-0 text-[13px]", DUE_TONE[due.tone])}>{due.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DeadlinesList({
  overdue,
  upcoming,
}: {
  overdue: TaskWithRelations[];
  upcoming: TaskWithRelations[];
}) {
  if (overdue.length === 0 && upcoming.length === 0) {
    return (
      <EmptyState
        compact
        title="Sin fechas límite esta semana"
        description="Las tareas con fecha en los próximos 7 días aparecerán aquí."
      />
    );
  }
  return (
    <div className="pb-3">
      <Group title="Con retraso" tasks={overdue} tone="critical" />
      <Group title="Próximos 7 días" tasks={upcoming} />
    </div>
  );
}
