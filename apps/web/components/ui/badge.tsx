import type { ReactNode } from "react";

const tones = {
  neutral: "bg-white/[0.05] text-white/80 ring-white/15",
  accent: "bg-plum/25 text-focus ring-orchid/30",
  warning: "bg-amber-400/10 text-amber-200 ring-amber-300/30",
} as const;

const dots = {
  released: "bg-emerald-400",
  progress: "bg-amber-400",
} as const;

/** Small pill label for status, version or licence */
export function Badge({
  children,
  tone = "neutral",
  dot,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  /** A coloured status dot before the label */
  dot?: keyof typeof dots;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full ${dots[dot]}`}
        />
      )}
      {children}
    </span>
  );
}
