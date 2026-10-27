"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyPoint } from "@/lib/queries";

type EndLabelProps = { x?: number | string; y?: number | string; value?: unknown; index?: number };

function makeEndLabel(last: number) {
  return function EndLabel(props: EndLabelProps) {
    if (props.index !== last || props.value === undefined || props.value === null) return null;
    return (
      <text
        x={Number(props.x) + 10}
        y={Number(props.y)}
        dy={4}
        fontSize={12}
        fontWeight={600}
        fill="var(--ink-2)"
      >
        {String(props.value)}
      </text>
    );
  };
}

type TipEntry = {
  name?: string | number;
  value?: number | string | ReadonlyArray<number | string>;
  color?: string;
  dataKey?: string | number;
};

function WeeklyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TipEntry>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="viz-tip">
      <p className="mb-1 text-[12px] text-muted">Semana del {label}</p>
      <ul className="flex flex-col gap-0.5">
        {[...payload].reverse().map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-0.5 w-3 rounded-full" style={{ background: entry.color }} />
            <strong className="tabular font-semibold text-ink">{String(entry.value ?? 0)}</strong>
            <span className="text-ink-2">{String(entry.name ?? "")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two-line chart: completions are the story (accent); creations are context (gray). */
export function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
  const last = data.length - 1;
  return (
    <div className="px-5 pb-5">
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2" aria-label="Leyenda">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--accent)" }} />
          Completadas
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--chart-context)" }} />
          Creadas
        </li>
      </ul>

      <div className="h-[232px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 30, bottom: 4, left: -8 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              dy={6}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
              content={<WeeklyTooltip />}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="creadas"
              name="Creadas"
              stroke="var(--chart-context)"
              strokeWidth={2}
              strokeLinecap="round"
              dot={{ r: 4, fill: "var(--chart-context)", stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "var(--chart-context)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
              label={makeEndLabel(last)}
            />
            <Line
              type="monotone"
              dataKey="completadas"
              name="Completadas"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeLinecap="round"
              dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
              label={makeEndLabel(last)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-2 text-[13px]">
        <summary className="cursor-pointer select-none text-ink-2 hover:text-ink">Ver como tabla</summary>
        <table className="tabular mt-3 w-full text-left">
          <thead>
            <tr className="text-[12.5px] text-muted">
              <th className="py-1.5 pr-3 font-medium">Semana del</th>
              <th className="py-1.5 pr-3 text-right font-medium">Creadas</th>
              <th className="py-1.5 text-right font-medium">Completadas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.weekStart} className="border-t border-line">
                <td className="py-1.5 pr-3 text-ink">{d.label}</td>
                <td className="py-1.5 pr-3 text-right text-ink-2">{d.creadas}</td>
                <td className="py-1.5 text-right text-ink-2">{d.completadas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
