import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 place-items-center rounded-[11px] bg-accent font-display text-xl font-bold text-accent-ink"
        >
          D
        </span>
        <span className="font-display text-[26px] font-semibold tracking-tight text-ink">Driony</span>
      </div>
      <div className="card w-full max-w-[420px] px-6 py-7 sm:px-8">{children}</div>
    </div>
  );
}
