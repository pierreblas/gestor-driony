import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Stat tile: label · value · optional note. Proportional figures on the value. */
export function StatTile({
  label,
  value,
  note,
  tone = "default",
  icon,
}: {
  label: string;
  value: number | string;
  note?: ReactNode;
  tone?: "default" | "warning" | "critical" | "good";
  icon?: ReactNode;
}) {
  const valueColor =
    tone === "critical"
      ? "text-critical-ink"
      : tone === "warning"
        ? "text-warning-ink"
        : tone === "good"
          ? "text-good-ink"
          : "text-ink";
  return (
    <div className="card flex flex-col justify-between gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-medium text-ink-2">{label}</p>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <div>
        <p className={cn("text-[32px] font-semibold leading-none tracking-tight", valueColor)}>{value}</p>
        {note ? <p className="mt-2 text-[13px] text-muted">{note}</p> : null}
      </div>
    </div>
  );
}
