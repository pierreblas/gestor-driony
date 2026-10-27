"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Round "done" checkbox: one click marks a task as completed. */
export function CompleteCheckbox({
  checked,
  onToggle,
  label,
  size = "md",
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  size?: "md" | "lg";
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={checked ? "Marcar como pendiente" : "Marcar como hecha"}
      onClick={onToggle}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 transition-colors",
        size === "lg" ? "h-7 w-7" : "h-[22px] w-[22px]",
        checked
          ? "border-good bg-good text-white"
          : "border-line-strong text-transparent hover:border-good hover:text-good",
      )}
    >
      <Check className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={3} aria-hidden />
    </button>
  );
}
