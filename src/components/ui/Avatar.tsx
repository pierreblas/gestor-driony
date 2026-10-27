import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  size = "md",
  muted = false,
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-[12px]",
    lg: "h-11 w-11 text-[15px]",
  } as const;
  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        muted ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent-strong",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function TeamDot({ slot, className }: { slot: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ background: `var(--cat-${slot})` }}
    />
  );
}
