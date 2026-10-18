import type { ReactNode } from "react";
import { HighlightedText } from "./highlighted-text";

/** Small uppercase label above a title, led by a short gradient rule */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={[
        "flex items-center gap-3 text-eyebrow font-semibold text-white/70 uppercase",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className="bg-brand-gradient h-0.5 w-6 shrink-0 rounded-full"
      />
      {children}
    </p>
  );
}

/**
 * Eyebrow, h2 title (with an optional gradient phrase) and an optional intro.
 * Give it an `id` so the section can point `aria-labelledby` at the title
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  highlight,
  description,
  className,
}: {
  id?: string;
  eyebrow?: string | null;
  title: string;
  highlight?: string | null;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["max-w-[44rem] space-y-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="text-h2 font-semibold">
        <HighlightedText text={title} highlight={highlight} />
      </h2>
      {description && <p className="text-lead text-white/70">{description}</p>}
    </div>
  );
}
