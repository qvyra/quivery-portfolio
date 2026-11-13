"use client";

import { textWidthSchema, type TextWidth } from "@repo/shared";
import { createContext, useContext, useId } from "react";

const names: Record<TextWidth, string> = {
  narrow: "Narrow",
  medium: "Medium",
  full: "Full",
};

/** The text width a form's text blocks follow when they don't set one */
export const InheritedWidth = createContext<{
  width: TextWidth;
  /** Where it's set, null when the form has no default (narrow) */
  from: string | null;
}>({ width: "narrow", from: null });

export const toTextWidth = (value: unknown): TextWidth | null => {
  const parsed = textWidthSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

/**
 * Narrow, medium or full as a segmented control. A section or page default
 * stores narrow as null. A text block can also follow that default instead
 * (`inherits`): nothing is pressed then, the followed width is outlined, and
 * pressing the chosen width again goes back to following it
 */
export function WidthControl({
  label,
  help,
  value,
  inherits,
  onChange,
}: {
  label: string;
  help?: string | undefined;
  value: TextWidth | null;
  inherits?: boolean;
  onChange: (value: TextWidth | null) => void;
}) {
  const id = useId();
  const inherited = useContext(InheritedWidth);
  // a default has no unset state, null is narrow
  const pressed = value ?? (inherits ? null : "narrow");
  const note = inherits
    ? value
      ? `Its own width. Press ${names[value]} again to follow ${inherited.from ?? "the default"} (${names[inherited.width]})`
      : `Follows ${inherited.from ?? "the default"}: ${names[inherited.width]}`
    : null;

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium">
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-note`}
        className="inline-flex gap-1 rounded-lg p-1 ring-1 ring-white/15 ring-inset"
      >
        {textWidthSchema.options.map((option) => {
          const on = pressed === option;
          const followed = inherits && !value && inherited.width === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(
                  inherits
                    ? on
                      ? null
                      : option
                    : option === "narrow"
                      ? null
                      : option,
                )
              }
              className={[
                "min-h-10 rounded-md px-4 text-sm font-medium",
                on
                  ? "bg-white/[0.14] text-white"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                followed &&
                  "text-white outline-1 -outline-offset-1 outline-white/40 outline-dashed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {names[option]}
            </button>
          );
        })}
      </div>
      <p id={`${id}-note`} className="mt-1.5 text-sm text-white/55">
        {[note, help].filter(Boolean).join(". ")}
      </p>
    </div>
  );
}
