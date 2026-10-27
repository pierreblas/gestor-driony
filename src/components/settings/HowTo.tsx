import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";

/** Collapsible step-by-step guide. The steps are a real sequence, so they are numbered. */
export function HowTo({ title, steps, footer }: { title: string; steps: ReactNode[]; footer?: ReactNode }) {
  return (
    <details className="group rounded-[10px] border border-line bg-surface-2/50">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3.5 py-2.5 text-[14px] font-medium text-accent-strong hover:text-ink">
        <CircleHelp className="h-4 w-4" aria-hidden />
        {title}
      </summary>
      <div className="border-t border-line px-3.5 pb-3.5 pt-3">
        <ol className="flex flex-col gap-2.5">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
              <span
                aria-hidden
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11.5px] font-semibold text-accent-strong"
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {footer ? <div className="mt-3 text-[13px] text-muted">{footer}</div> : null}
      </div>
    </details>
  );
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-accent-strong underline-offset-2 hover:underline">
      {children}
    </a>
  );
}
