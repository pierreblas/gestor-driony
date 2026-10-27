"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { markTutorialSeen } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

export const TOUR_EVENT = "app:tour";

/** Start the guided tour from anywhere (e.g. the help button). */
export function startTour() {
  window.dispatchEvent(new Event(TOUR_EVENT));
}

type Step = {
  /** data-tour value to highlight; omit for a centered card. */
  target?: string;
  title: string;
  body: string;
  roles?: string[];
};

const MANAGERS = ["ADMIN", "GESTOR"];

const STEPS: Step[] = [
  {
    title: "Te damos la bienvenida a Driony",
    body: "En un minuto te enseño lo esencial para organizar tu trabajo. Puedes salir cuando quieras y repetirlo más tarde.",
  },
  {
    target: "nav-mis-tareas",
    title: "Mis tareas, tu punto de partida",
    body: "Aquí ves solo lo tuyo, ordenado por urgencia: con retraso, para hoy, esta semana y más adelante.",
  },
  {
    target: "quick-add",
    title: "Añade una tarea en segundos",
    body: "Escribe lo que tienes que hacer y pulsa Enter. Con los botones eliges para cuándo: hoy, mañana o en una semana.",
  },
  {
    target: "task-list",
    title: "Marca y avanza",
    body: "Pulsa el círculo para marcar una tarea como hecha; si te equivocas, aparece «Deshacer». «Empezar» indica que ya estás con ella.",
  },
  {
    target: "copilot",
    title: "Tu copiloto con IA",
    body: "Cuéntale lo que hay que hacer, o pídele ideas para un equipo, y lo convierte en tareas. Siempre las revisas antes de crearlas.",
  },
  {
    target: "nav-resumen",
    title: "El resumen del equipo",
    body: "Cómo va todo de un vistazo: qué está con retraso, la carga de cada persona y el ritmo de cada semana.",
    roles: MANAGERS,
  },
  {
    target: "nav-tareas",
    title: "Todas las tareas",
    body: "El trabajo de todos los equipos, en tabla o en tablero. En el tablero puedes arrastrar las tareas de una columna a otra.",
    roles: MANAGERS,
  },
  {
    target: "nav-equipos",
    title: "Equipos",
    body: "Agrupa a las personas por área, elige quién lidera cada equipo y sigue su avance.",
    roles: MANAGERS,
  },
  {
    target: "nav-usuarios",
    title: "Personas y accesos",
    body: "Al añadir a alguien le llega un correo para activar su cuenta. El icono del sobre le reenvía el acceso.",
    roles: ["ADMIN"],
  },
  {
    target: "nav-ajustes",
    title: "Ajustes",
    body: "Configura el correo y el copiloto. Cada sección trae una guía paso a paso para hacerlo sin ayuda.",
    roles: ["ADMIN"],
  },
  {
    target: "help",
    title: "Vuelve aquí cuando quieras",
    body: "Este botón repite el recorrido. En Mi cuenta puedes cambiar tu contraseña o cerrar sesión.",
  },
  {
    title: "¡Todo listo!",
    body: "Ya conoces lo esencial. Un buen primer paso: añade la próxima tarea que tengas pendiente.",
  },
];

const PAD = 6;
const CARD_W = 340;
const GAP = 14;

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  // Prefer a visible one (desktop and mobile layouts can both have the target).
  return all.find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0) ?? null;
}

export function ProductTour({ role, autoStart }: { role: string; autoStart: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const steps = STEPS.filter((s) => !s.roles || s.roles.includes(role));
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const start = useCallback(() => {
    setIndex(0);
    setRect(null);
    setRunning(true);
    if (pathname !== "/mis-tareas") router.push("/mis-tareas");
  }, [pathname, router]);

  const finish = useCallback(() => {
    setRunning(false);
    setRect(null);
    if (!markedRef.current) {
      markedRef.current = true;
      void markTutorialSeen();
    }
  }, []);

  // First visit: start shortly after the page settles. Afterwards only via the help button.
  useEffect(() => {
    if (!autoStart) return;
    const timer = window.setTimeout(start, 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    const onStart = () => start();
    window.addEventListener(TOUR_EVENT, onStart);
    return () => window.removeEventListener(TOUR_EVENT, onStart);
  }, [start]);

  // Locate and measure the current target; skip steps whose target isn't on screen.
  useLayoutEffect(() => {
    if (!running || !step) return;
    let cancelled = false;
    let tries = 0;
    let timer = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const measure = () => {
      if (cancelled) return;
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = findTarget(step.target);
      if (!el) {
        // The page may still be loading (e.g. right after navigating).
        if (tries++ < 12) {
          timer = window.setTimeout(measure, 150);
          return;
        }
        setIndex((i) => Math.min(i + 1, steps.length - 1));
        return;
      }
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
      }, reduced ? 0 : 280);
    };
    measure();

    const onChange = () => {
      if (!step.target) return setViewport({ w: window.innerWidth, h: window.innerHeight });
      const el = findTarget(step.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [running, index, step, steps.length, pathname]);

  // Keyboard: arrows move, Escape closes. Focus the card on every step.
  useEffect(() => {
    if (!running) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setIndex((i) => (i < steps.length - 1 ? i + 1 : i));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, index, steps.length, finish]);

  if (!running || !step) return null;

  // Card position: beside the target when there's room (sidebar), otherwise below or above.
  let cardStyle: React.CSSProperties;
  const narrow = viewport.w < 640;
  const cardW = Math.min(CARD_W, viewport.w - 32);
  if (!rect || !step.target) {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: Math.min(420, viewport.w - 32) };
  } else if (!narrow && rect.left + rect.width + GAP + cardW < viewport.w - 16 && rect.left < viewport.w / 3) {
    const top = Math.min(Math.max(16, rect.top), viewport.h - 260);
    cardStyle = { top, left: rect.left + rect.width + GAP, width: cardW };
  } else {
    const below = rect.top + rect.height + GAP;
    const left = Math.min(Math.max(16, rect.left), viewport.w - cardW - 16);
    cardStyle =
      below + 230 < viewport.h
        ? { top: below, left, width: cardW }
        : { top: Math.max(16, rect.top - GAP - 230), left, width: cardW };
  }

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Dim everything except the highlighted element. Clicks outside the card are absorbed. */}
      {rect && step.target ? (
        <div
          aria-hidden
          className="tour-spotlight pointer-events-none fixed rounded-[12px]"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[rgb(10_16_28/0.55)]" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="tour-card fixed rounded-[14px] border border-line bg-surface p-5 text-ink shadow-[0_24px_64px_-20px_rgb(10_16_28/0.55)] outline-none"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12.5px] font-medium text-muted">
            Paso {index + 1} de {steps.length}
          </p>
          <button
            type="button"
            onClick={finish}
            aria-label="Cerrar el recorrido"
            className="-mr-2 -mt-2 grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h2 id={titleId} className="mt-1 font-display text-[19px] font-semibold leading-snug tracking-tight">
          {step.title}
        </h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{step.body}</p>

        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-accent-soft" aria-hidden>
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {index === 0 ? (
            <Button variant="ghost" size="sm" onClick={finish}>
              Ahora no
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
              Atrás
            </Button>
          )}
          <Button size="sm" onClick={() => (isLast ? finish() : setIndex((i) => i + 1))} autoFocus>
            {index === 0 ? "Empezar recorrido" : isLast ? "Terminar" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
