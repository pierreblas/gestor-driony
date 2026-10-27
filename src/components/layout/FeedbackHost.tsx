"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import {
  CONFIRM_EVENT,
  TOAST_EVENT,
  type ConfirmDetail,
  type ToastDetail,
} from "@/lib/feedback";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ToastItem = ToastDetail & { id: number };

let nextId = 1;

/** Renders toasts and the confirmation dialog for the whole app. */
export function FeedbackHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmDetail | null>(null);

  useEffect(() => {
    const dismissLater = (id: number, ms: number) =>
      window.setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), ms);

    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      const id = nextId++;
      setToasts((all) => [...all.slice(-2), { ...detail, id }]);
      dismissLater(id, detail.action ? 7000 : 3500);
    };
    const onConfirm = (event: Event) => {
      setConfirm((event as CustomEvent<ConfirmDetail>).detail);
    };

    window.addEventListener(TOAST_EVENT, onToast);
    window.addEventListener(CONFIRM_EVENT, onConfirm);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.removeEventListener(CONFIRM_EVENT, onConfirm);
    };
  }, []);

  function finish(value: boolean) {
    confirm?.resolve(value);
    setConfirm(null);
  }

  function dismiss(id: number) {
    setToasts((all) => all.filter((t) => t.id !== id));
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const Icon = t.tone === "error" ? CircleAlert : CircleCheck;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[12px] bg-brand px-4 py-3 text-brand-ink shadow-[0_16px_40px_-16px_rgb(16_24_40/0.6)]"
            >
              <Icon
                className={cn("h-5 w-5 shrink-0", t.tone === "error" ? "text-[#ef7c7c]" : "text-[#5ad35a]")}
                aria-hidden
              />
              <p className="min-w-0 flex-1 text-[14px] font-medium">{t.message}</p>
              {t.action ? (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="shrink-0 rounded-[8px] px-2.5 py-1 text-[14px] font-semibold text-[#86b6ef] hover:bg-brand-2"
                >
                  {t.action.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-brand-muted hover:bg-brand-2 hover:text-brand-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={confirm !== null} onClose={() => finish(false)} title={confirm?.title ?? ""}>
        {confirm ? (
          <div>
            <p className="text-[15px] leading-relaxed text-ink-2">{confirm.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => finish(false)}>
                Cancelar
              </Button>
              <Button
                variant={confirm.tone === "danger" ? "destructive" : "primary"}
                onClick={() => finish(true)}
                autoFocus
              >
                {confirm.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
