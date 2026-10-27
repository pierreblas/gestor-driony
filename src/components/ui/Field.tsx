import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string[] | string;
  className?: string;
  children: ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13.5px] font-medium text-ink">
        {label}
      </label>
      {children}
      {message ? (
        <p className="text-[13px] text-critical-ink" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13.5px] text-critical-ink"
    >
      {message}
    </div>
  );
}
