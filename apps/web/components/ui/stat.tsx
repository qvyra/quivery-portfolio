import type { ReactNode } from "react";
import { Reveal } from "./reveal";

/**
 * Big number with its label. The dt comes first in the DOM, as a description
 * list requires, but shows after the number: below it on small phones,
 * beside it from 640px
 */
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse gap-1 sm:flex-row-reverse sm:items-center sm:justify-end sm:gap-3">
      <dt className="text-sm leading-snug text-white/70 sm:max-w-[10ch] sm:text-base">
        {label}
      </dt>
      <dd className="text-stat font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Row of stats that reveal one after another as they scroll into view */
export function StatList({ children }: { children: ReactNode }) {
  return (
    <Reveal
      as="dl"
      stagger
      className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-8 lg:grid-cols-4 lg:pt-10"
    >
      {children}
    </Reveal>
  );
}
