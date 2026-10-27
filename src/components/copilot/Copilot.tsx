"use client";

import { useCallback, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { copilotCreate, copilotSuggest, type Proposal } from "@/lib/actions/copilot";
import { PRIORITY_LABEL, TASK_PRIORITIES, isTaskPriority } from "@/lib/constants";
import { toast } from "@/lib/feedback";
import type { TeamOption, UserOption } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { TeamDot } from "@/components/ui/Avatar";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useCurrentUser } from "@/components/layout/CurrentUserProvider";

const EXAMPLES = [
  "Organizar la mudanza de la oficina el próximo viernes",
  "Preparar el cierre contable del mes",
  "Lanzar la campaña de Navidad en redes",
];

type Draft = Proposal & { selected: boolean };

/** Button + dialog. aiReady=false explains how to turn it on instead. */
export function CopilotButton({
  teams,
  users,
  aiReady,
  defaultTeamId,
  variant = "secondary",
}: {
  teams: TeamOption[];
  users: UserOption[];
  aiReady: boolean;
  defaultTeamId?: string;
  variant?: ButtonProps["variant"];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" aria-hidden />
        Copiloto
      </Button>
      <Modal
        open={open}
        onClose={close}
        size="lg"
        title="Copiloto"
        description="Cuéntale qué hay que hacer o pídele ideas para un equipo. Revisas las propuestas antes de crear nada."
      >
        {open ? (
          aiReady ? (
            <CopilotPanel teams={teams} users={users} defaultTeamId={defaultTeamId} onDone={close} />
          ) : (
            <NotConfigured />
          )
        ) : null}
      </Modal>
    </>
  );
}

function NotConfigured() {
  const me = useCurrentUser();
  return (
    <div className="py-4 text-center">
      <Sparkles className="mx-auto h-9 w-9 text-accent" aria-hidden />
      <p className="mt-3 text-[15px] font-medium text-ink">El copiloto aún no está activado</p>
      <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-2">
        {me?.role === "ADMIN"
          ? "Añade una clave de API de Anthropic en Ajustes para empezar a usarlo."
          : "Pide a la administración que añada la clave de API en Ajustes."}
      </p>
      {me?.role === "ADMIN" ? (
        <Link href="/ajustes" className="mt-4 inline-block text-[14px] font-medium text-accent-strong hover:underline">
          Ir a Ajustes
        </Link>
      ) : null}
    </div>
  );
}

function CopilotPanel({
  teams,
  users,
  defaultTeamId,
  onDone,
}: {
  teams: TeamOption[];
  users: UserOption[];
  defaultTeamId?: string;
  onDone: () => void;
}) {
  const me = useCurrentUser();
  const isMember = me?.role === "MIEMBRO";
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thinking, startThinking] = useTransition();
  const [creating, startCreating] = useTransition();
  const [lastAsk, setLastAsk] = useState<Parameters<typeof copilotSuggest>[0] | null>(null);

  const activeUsers = users.filter((u) => u.active);
  const suggestTeams = defaultTeamId ? teams.filter((t) => t.id === defaultTeamId) : teams;

  function ask(input: Parameters<typeof copilotSuggest>[0]) {
    setError(null);
    setLastAsk(input);
    startThinking(async () => {
      const result = await copilotSuggest(input);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setReply(result.message);
      setDrafts(result.proposals.map((p) => ({ ...p, selected: true })));
    });
  }

  function handleDescribe(event: FormEvent) {
    event.preventDefault();
    ask({ mode: "describe", text, teamId: defaultTeamId });
  }

  function update(key: string, patch: Partial<Draft>) {
    setDrafts((all) => all?.map((d) => (d.key === key ? { ...d, ...patch } : d)) ?? null);
  }

  const chosen = drafts?.filter((d) => d.selected && d.title.trim().length >= 3) ?? [];

  function create() {
    setError(null);
    startCreating(async () => {
      const result = await copilotCreate(
        chosen.map((d) => ({
          title: d.title,
          description: d.description,
          teamId: d.teamId,
          assigneeId: d.assigneeId,
          priority: d.priority,
          dueDate: d.dueDate,
        })),
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast(result.message);
      onDone();
    });
  }

  // ---------- Step 1: ask ----------
  if (drafts === null) {
    return (
      <div className="flex flex-col gap-5">
        <form onSubmit={handleDescribe} className="flex flex-col gap-2.5">
          <label htmlFor="copilot-text" className="text-[14px] font-semibold text-ink">
            ¿Qué hay que hacer?
          </label>
          <textarea
            id="copilot-text"
            className="control min-h-[96px] text-[15px]"
            placeholder="Por ejemplo: la semana que viene llega un cliente nuevo, hay que preparar el contrato, darle de alta y hacerle una formación"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleDescribe(e);
            }}
            autoFocus
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  {ex}
                </button>
              ))}
            </div>
            <Button type="submit" loading={thinking} disabled={text.trim().length < 3}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Crear tareas con IA
            </Button>
          </div>
        </form>

        <div className="border-t border-line pt-4">
          <p className="mb-2 text-[14px] font-semibold text-ink">O pide ideas para un equipo</p>
          <div className="flex flex-wrap gap-2">
            {suggestTeams.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={thinking}
                onClick={() => ask({ mode: "suggest", teamId: t.id, text })}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-[14px] font-medium text-ink hover:border-accent hover:bg-accent-soft/50 disabled:opacity-60"
              >
                <TeamDot slot={t.colorSlot} />
                Sugerir para {t.name}
              </button>
            ))}
          </div>
          {text.trim() ? (
            <p className="mt-2 text-[12.5px] text-muted">Lo que escribiste arriba se usará como indicación.</p>
          ) : null}
        </div>

        {thinking ? (
          <p role="status" className="flex items-center gap-2 text-[14px] text-ink-2">
            <Sparkles className="h-4 w-4 animate-pulse text-accent" aria-hidden />
            Pensando propuestas…
          </p>
        ) : null}
        <FormError message={error} />
      </div>
    );
  }

  // ---------- Step 2: review ----------
  return (
    <div className="flex flex-col gap-4">
      {reply ? (
        <p className="flex items-start gap-2 rounded-[10px] bg-accent-soft/60 px-3.5 py-2.5 text-[14px] text-ink">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          {reply}
        </p>
      ) : null}

      {drafts.length === 0 ? (
        <p className="text-[14px] text-ink-2">No hay propuestas. Prueba a describirlo con más detalle.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {drafts.map((d) => (
            <li
              key={d.key}
              className={cn(
                "rounded-[12px] border p-3 transition-colors",
                d.selected ? "border-line-strong bg-surface" : "border-line bg-surface-2/60 opacity-70",
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={d.selected}
                  onChange={(e) => update(d.key, { selected: e.target.checked })}
                  aria-label={`Incluir «${d.title}»`}
                  className="mt-2.5 h-4 w-4 shrink-0 accent-accent"
                />
                <div className="min-w-0 flex-1">
                  <input
                    value={d.title}
                    onChange={(e) => update(d.key, { title: e.target.value })}
                    aria-label="Título"
                    maxLength={140}
                    className="w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[15px] font-medium text-ink hover:border-line focus:border-accent focus:outline-none"
                  />
                  {d.description ? <p className="px-2 text-[13px] text-ink-2">{d.description}</p> : null}
                  <div className="mt-2 grid gap-2 px-2 sm:grid-cols-[1fr_1.4fr_1fr_1fr]">
                    <select
                      aria-label="Equipo"
                      className="control h-8 py-0 text-[13px]"
                      value={d.teamId}
                      onChange={(e) => update(d.key, { teamId: e.target.value })}
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Responsable"
                      className="control h-8 py-0 text-[13px]"
                      value={d.assigneeId ?? ""}
                      disabled={isMember}
                      onChange={(e) => update(d.key, { assigneeId: e.target.value || null })}
                    >
                      {!isMember ? <option value="">Sin asignar</option> : null}
                      {(isMember ? activeUsers.filter((u) => u.id === me?.id) : activeUsers).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                          {u.id === me?.id ? " (yo)" : ""}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Prioridad"
                      className="control h-8 py-0 text-[13px]"
                      value={d.priority}
                      onChange={(e) => {
                        if (isTaskPriority(e.target.value)) update(d.key, { priority: e.target.value });
                      }}
                    >
                      {TASK_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          Prioridad {PRIORITY_LABEL[p].toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      aria-label="Fecha límite"
                      className="control h-8 py-0 text-[13px]"
                      value={d.dueDate ?? ""}
                      onChange={(e) => update(d.key, { dueDate: e.target.value || null })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-btn mt-1"
                  title="Quitar"
                  aria-label={`Quitar «${d.title}»`}
                  onClick={() => setDrafts((all) => all?.filter((x) => x.key !== d.key) ?? null)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormError message={error} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setDrafts(null);
              setError(null);
            }}
          >
            Volver
          </Button>
          {lastAsk ? (
            <Button variant="ghost" loading={thinking} onClick={() => ask(lastAsk)}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Otras ideas
            </Button>
          ) : null}
        </div>
        <Button onClick={create} loading={creating} disabled={chosen.length === 0}>
          {chosen.length === 1 ? "Crear 1 tarea" : `Crear ${chosen.length} tareas`}
        </Button>
      </div>
    </div>
  );
}
