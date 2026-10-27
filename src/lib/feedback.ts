import type { ActionState } from "./validation";

export const TOAST_EVENT = "app:toast";
export const CONFIRM_EVENT = "app:confirm";

export type ToastAction = { label: string; onClick: () => void };
export type ToastDetail = { message: string; tone: "success" | "error"; action?: ToastAction };

/** Show a short message at the bottom of the screen. */
export function toast(message: string, options: { tone?: "success" | "error"; action?: ToastAction } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, {
      detail: { message, tone: options.tone ?? "success", action: options.action },
    }),
  );
}

/** Toast the outcome of a server action. Returns true when it succeeded. */
export function toastResult(result: ActionState): boolean {
  if (!result) return true;
  if (result.ok) {
    if (result.message) toast(result.message);
    return true;
  }
  toast(result.message, { tone: "error" });
  return false;
}

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
};
export type ConfirmDetail = ConfirmOptions & { resolve: (value: boolean) => void };

/** Ask before doing something that cannot be undone. Resolves true when confirmed. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<ConfirmDetail>(CONFIRM_EVENT, { detail: { ...options, resolve } }));
  });
}
