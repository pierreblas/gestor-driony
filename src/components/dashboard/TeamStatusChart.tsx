import Link from "next/link";
import { STATUS_CHART_VAR, STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";
import type { TeamStatusRow } from "@/lib/queries";
import { TeamDot } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/Card";

/**
 * Stacked horizontal bars, one per team, segmented by status on the ordinal blue ramp.
 * Bars are scaled to the team with the most tasks; 2px surface gaps separate segments.
 */
export function TeamStatusChart({ rows }: { rows: TeamStatusRow[] }) {
  const withTasks = rows.filter((r) => r.total > 0);
  if (withTasks.length === 0) {
    return (
      <EmptyState
        compact
        title="Aún no hay tareas"
        description="Cuando los equipos tengan tareas verás aquí cómo avanzan."
      />
    );
  }
  const max = Math.max(1, ...withTasks.map((r) => r.total));

  return (
    <div className="px-5 pb-5">
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2" aria-label="Leyenda">
        {TASK_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: STATUS_CHART_VAR[s] }} />
            {STATUS_LABEL[s]}
          </li>
        ))}
      </ul>

      <ol className="flex flex-col gap-3.5">
        {withTasks.map((row) => (
          <li key={row.teamId} className="grid grid-cols-[minmax(0,128px)_1fr_2rem] items-center gap-3">
            <Link
              href={`/equipos/${row.teamId}`}
              className="flex min-w-0 items-center gap-2 text-[13.5px] font-medium text-ink hover:underline"
            >
              <TeamDot slot={row.colorSlot} />
              <span className="truncate">{row.name}</span>
            </Link>
            <div className="flex h-5 items-center gap-0.5" style={{ width: `${(row.total / max) * 100}%` }}>
              {TASK_STATUSES.map((s) => {
                const n = row.byStatus[s];
                if (!n) return null;
                return (
                  <span
                    key={s}
                    tabIndex={0}
                    role="img"
                    aria-label={`${row.name}: ${n} ${STATUS_LABEL[s].toLowerCase()}`}
                    className="seg block h-full min-w-[4px] first:rounded-l-none last:rounded-r-[4px]"
                    style={{ flexGrow: n, flexBasis: 0, background: STATUS_CHART_VAR[s] }}
                  >
                    <span className="seg-tip viz-tip">
                      <strong className="font-semibold">{n}</strong>{" "}
                      <span className="text-ink-2">{STATUS_LABEL[s].toLowerCase()}</span>
                    </span>
                  </span>
                );
              })}
            </div>
            <span className="tabular text-right text-[13px] text-ink-2">{row.total}</span>
          </li>
        ))}
      </ol>

      <details className="mt-5 text-[13px]">
        <summary className="cursor-pointer select-none text-ink-2 hover:text-ink">Ver como tabla</summary>
        <table className="tabular mt-3 w-full text-left">
          <thead>
            <tr className="text-[12.5px] text-muted">
              <th className="py-1.5 pr-3 font-medium">Equipo</th>
              {TASK_STATUSES.map((s) => (
                <th key={s} className="py-1.5 pr-3 text-right font-medium">
                  {STATUS_LABEL[s]}
                </th>
              ))}
              <th className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {withTasks.map((row) => (
              <tr key={row.teamId} className="border-t border-line">
                <td className="py-1.5 pr-3 text-ink">{row.name}</td>
                {TASK_STATUSES.map((s) => (
                  <td key={s} className="py-1.5 pr-3 text-right text-ink-2">
                    {row.byStatus[s]}
                  </td>
                ))}
                <td className="py-1.5 text-right font-medium text-ink">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
