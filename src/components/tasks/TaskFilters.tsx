"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, List, Search } from "lucide-react";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/constants";
import type { TeamOption, UserOption } from "@/lib/queries";
import { cn, pluralize } from "@/lib/utils";

const FILTER_KEYS = ["q", "estado", "prioridad", "equipo", "responsable"] as const;

export function TaskFilters({
  teams,
  users,
  total,
}: {
  teams: TeamOption[];
  users: UserOption[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  // Debounced search.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q.trim() === current) return;
    const timer = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(timer);
  }, [q, searchParams, update]);

  const view = searchParams.get("vista") === "tablero" ? "tablero" : "tabla";
  const hasFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  function clearFilters() {
    setQ("");
    startTransition(() => {
      router.replace(view === "tablero" ? `${pathname}?vista=tablero` : pathname, { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 transition-opacity lg:flex-row lg:items-center lg:justify-between",
        isPending && "opacity-70",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Buscar tareas</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            className="control h-9 w-56 pl-9 text-[14px]"
            placeholder="Buscar tareas"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>

        <select
          aria-label="Estado"
          className="control h-9 w-auto text-[14px]"
          value={searchParams.get("estado") ?? ""}
          onChange={(e) => update({ estado: e.target.value || null })}
        >
          <option value="">Todos los estados</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          aria-label="Prioridad"
          className="control h-9 w-auto text-[14px]"
          value={searchParams.get("prioridad") ?? ""}
          onChange={(e) => update({ prioridad: e.target.value || null })}
        >
          <option value="">Todas las prioridades</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>

        <select
          aria-label="Equipo"
          className="control h-9 w-auto text-[14px]"
          value={searchParams.get("equipo") ?? ""}
          onChange={(e) => update({ equipo: e.target.value || null })}
        >
          <option value="">Todos los equipos</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Responsable"
          className="control h-9 w-auto text-[14px]"
          value={searchParams.get("responsable") ?? ""}
          onChange={(e) => update({ responsable: e.target.value || null })}
        >
          <option value="">Cualquier responsable</option>
          <option value="none">Sin asignar</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.active ? "" : " (inactivo)"}
            </option>
          ))}
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="h-9 px-2 text-[13.5px] font-medium text-accent-strong hover:underline"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted">
          {total} {pluralize(total, "tarea", "tareas")}
        </span>
        <div role="group" aria-label="Vista" className="inline-flex rounded-control border border-line-strong bg-surface p-0.5">
          <button
            type="button"
            aria-pressed={view === "tabla"}
            onClick={() => update({ vista: null })}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-medium transition-colors",
              view === "tabla" ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            <List className="h-4 w-4" aria-hidden />
            Tabla
          </button>
          <button
            type="button"
            aria-pressed={view === "tablero"}
            onClick={() => update({ vista: "tablero" })}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-medium transition-colors",
              view === "tablero" ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            <Columns3 className="h-4 w-4" aria-hidden />
            Tablero
          </button>
        </div>
      </div>
    </div>
  );
}
