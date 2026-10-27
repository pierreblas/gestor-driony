import Link from "next/link";
import type { WorkloadRow } from "@/lib/queries";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/Card";

/** Single-series horizontal bars (one hue): open tasks per person, value at the tip. */
export function WorkloadBars({ rows }: { rows: WorkloadRow[] }) {
  const withWork = rows.filter((r) => r.open > 0);
  if (withWork.length === 0) {
    return (
      <EmptyState
        compact
        title="Nadie tiene tareas en curso"
        description="Asigna tareas a las personas para ver su carga aquí."
      />
    );
  }
  const max = Math.max(1, ...withWork.map((r) => r.open));

  return (
    <ol className="flex flex-col gap-3 px-5 pb-5">
      {withWork.map((row) => (
        <li key={row.userId} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3">
          <Link
            href={`/tareas?responsable=${row.userId}`}
            className="flex min-w-0 items-center gap-2 text-[13.5px] font-medium text-ink hover:underline"
          >
            <Avatar name={row.name} size="sm" />
            <span className="truncate">{row.name}</span>
          </Link>
          <div className="flex h-5 items-center">
            <span
              tabIndex={0}
              role="img"
              aria-label={`${row.name}: ${row.open} en curso${row.overdue ? `, ${row.overdue} con retraso` : ""}`}
              className="seg block h-full rounded-r-[4px]"
              style={{ width: `${(row.open / max) * 100}%`, minWidth: 4, background: "var(--ord-3)" }}
            >
              <span className="seg-tip viz-tip">
                <strong className="font-semibold">{row.open}</strong>{" "}
                <span className="text-ink-2">en curso</span>
                {row.overdue ? <span className="text-critical-ink">, {row.overdue} con retraso</span> : null}
              </span>
            </span>
          </div>
          <div className="w-[88px] text-right leading-tight">
            <span className="tabular text-[13px] font-medium text-ink">{row.open}</span>
            {row.overdue > 0 ? (
              <p className="text-[11.5px] text-critical-ink">{row.overdue} con retraso</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
