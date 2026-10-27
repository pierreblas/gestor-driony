"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleCheck,
  LayoutDashboard,
  ListChecks,
  CircleHelp,
  LogOut,
  Settings,
  UsersRound,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { ROLE_LABEL, isUserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "./ThemeToggle";
import { startTour } from "@/components/tour/ProductTour";

function HelpButton() {
  return (
    <button
      type="button"
      data-tour="help"
      onClick={startTour}
      aria-label="Ver el recorrido guiado"
      title="Ver el recorrido guiado"
      className="grid h-9 w-9 place-items-center rounded-[10px] text-brand-muted transition-colors hover:bg-brand-2 hover:text-brand-ink"
    >
      <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

type NavItem = { href: string; label: string; icon: LucideIcon; roles: string[] };

const NAV: NavItem[] = [
  { href: "/mis-tareas", label: "Mis tareas", icon: CircleCheck, roles: ["ADMIN", "GESTOR", "MIEMBRO"] },
  { href: "/", label: "Resumen", icon: LayoutDashboard, roles: ["ADMIN", "GESTOR"] },
  { href: "/tareas", label: "Todas las tareas", icon: ListChecks, roles: ["ADMIN", "GESTOR"] },
  { href: "/equipos", label: "Equipos", icon: UsersRound, roles: ["ADMIN", "GESTOR"] },
  { href: "/usuarios", label: "Personas", icon: UserRound, roles: ["ADMIN"] },
  { href: "/ajustes", label: "Ajustes", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar({ user }: { user: { name: string; email: string; role: string } }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="bg-brand text-brand-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[260px] lg:shrink-0 lg:flex-col">
      <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-6 lg:pb-6 lg:pt-8">
        <Link href="/mis-tareas" className="flex items-center gap-3 rounded-md">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-[10px] bg-accent font-display text-lg font-bold text-accent-ink"
          >
            D
          </span>
          <span className="font-display text-[22px] font-semibold tracking-tight">Driony</span>
        </Link>
        <div className="flex items-center gap-1 lg:hidden">
          <HelpButton />
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="grid h-9 w-9 place-items-center rounded-[10px] text-brand-muted hover:bg-brand-2 hover:text-brand-ink"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          </form>
        </div>
      </div>

      {items.length > 1 ? (
        <nav aria-label="Principal" className="px-2 pb-2 lg:flex-1 lg:px-3">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    data-tour={item.href === "/" ? "nav-resumen" : `nav-${item.href.slice(1)}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-medium transition-colors",
                      active ? "bg-brand-2 text-brand-ink" : "text-brand-muted hover:bg-brand-2/60 hover:text-brand-ink",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : (
        <div className="lg:flex-1" />
      )}

      <div className="hidden border-t border-white/10 px-4 py-4 lg:block">
        <Link
          href="/cuenta"
          className={cn(
            "flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-brand-2",
            pathname.startsWith("/cuenta") && "bg-brand-2",
          )}
        >
          <Avatar name={user.name} />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold">{user.name}</span>
            <span className="block truncate text-[12px] text-brand-muted">
              {isUserRole(user.role) ? ROLE_LABEL[user.role] : user.role} · Mi cuenta
            </span>
          </span>
        </Link>
        <div className="mt-2 flex items-center justify-between px-1">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13.5px] font-medium text-brand-muted hover:bg-brand-2 hover:text-brand-ink"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Cerrar sesión
            </button>
          </form>
          <div className="flex items-center gap-1">
            <HelpButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
