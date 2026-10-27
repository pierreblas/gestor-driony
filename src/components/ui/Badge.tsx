import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  type TaskPriority,
  type TaskStatus,
  type UserRole,
} from "@/lib/constants";

type Tone = "neutral" | "accent" | "good" | "warning" | "serious" | "critical";

const TONE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  accent: "bg-accent-soft text-accent-strong border-transparent",
  good: "bg-good-soft text-good-ink border-transparent",
  warning: "bg-warning-soft text-warning-ink border-transparent",
  serious: "bg-serious-soft text-serious-ink border-transparent",
  critical: "bg-critical-soft text-critical-ink border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12.5px] font-medium leading-5",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<TaskStatus, Tone> = {
  PENDIENTE: "neutral",
  EN_PROGRESO: "accent",
  EN_REVISION: "warning",
  COMPLETADA: "good",
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  BAJA: "bg-muted",
  MEDIA: "bg-ink-2",
  ALTA: "bg-serious",
  URGENTE: "bg-critical",
};

/** Priority = ordered severity: a dot + the word, never color alone. */
export function PriorityLabel({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium",
        priority === "URGENTE" ? "text-critical-ink" : priority === "ALTA" ? "text-serious-ink" : "text-ink-2",
        className,
      )}
    >
      <span aria-hidden className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[priority])} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const ROLE_TONE: Record<UserRole, Tone> = {
  ADMIN: "accent",
  GESTOR: "neutral",
  MIEMBRO: "neutral",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>;
}
