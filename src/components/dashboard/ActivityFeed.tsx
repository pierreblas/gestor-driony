import {
  ArrowRight,
  Check,
  Plus,
  Trash2,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { ActivityItem } from "@/lib/queries";
import { timeAgo } from "@/lib/utils";
import { EmptyState } from "@/components/ui/Card";

function iconFor(type: string): LucideIcon {
  if (type === "TAREA_COMPLETADA") return Check;
  if (type === "TAREA_CREADA" || type === "EQUIPO_CREADO" || type === "USUARIO_CREADO") return Plus;
  if (type === "ESTADO_CAMBIADO") return ArrowRight;
  if (type.endsWith("_ELIMINADO") || type.endsWith("_ELIMINADA")) return Trash2;
  if (type.startsWith("EQUIPO") || type.startsWith("MIEMBRO")) return UsersRound;
  return UserRound;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title="Todavía no hay actividad"
        description="Los cambios en tareas, equipos y usuarios se registran aquí."
      />
    );
  }
  return (
    <ol className="divide-y divide-line pb-2">
      {items.map((item) => {
        const Icon = iconFor(item.type);
        const good = item.type === "TAREA_COMPLETADA";
        return (
          <li key={item.id} className="flex items-start gap-3 px-5 py-2.5">
            <span
              aria-hidden
              className={
                good
                  ? "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-good-soft text-good-ink"
                  : "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2"
              }
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-snug text-ink">{item.message}</p>
              <p className="mt-0.5 text-[12px] text-muted">{timeAgo(item.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
