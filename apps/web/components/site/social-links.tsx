"use client";

import type { ContactLink } from "@repo/shared";
import { Check } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/** A link in the row, with its icon already rendered (see social-items.tsx) */
export type SocialItem = { link: ContactLink; icon: ReactNode };

// 48px round targets. Only the hover overlay's opacity and a slight press
// scale animate
const itemClass = [
  "relative isolate grid size-12 place-items-center rounded-full bg-white/[0.04] text-white/85 ring-1 ring-white/15 ring-inset [&_.site-icon-image]:size-5 [&_svg]:size-5",
  "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-white/10 before:opacity-0 before:transition-opacity before:duration-(--motion-base) before:ease-out-quart",
  "transition-[scale] duration-(--motion-fast) ease-out-quart hover:text-white hover:before:opacity-100 motion-safe:active:scale-95",
].join(" ");

/**
 * Row of round icon links. One without a URL, like a Discord handle, copies
 * its value instead
 */
export function SocialLinks({
  items,
  className,
}: {
  items: SocialItem[];
  className?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (link: ContactLink) => {
    try {
      await navigator.clipboard.writeText(link.value);
      setCopied(link.id);
    } catch {
      // clipboard unavailable (insecure context or denied), nothing to do
    }
  };

  return (
    <>
      <ul
        className={["flex flex-wrap gap-3", className]
          .filter(Boolean)
          .join(" ")}
      >
        {items.map(({ link, icon }) => {
          const external = link.url?.startsWith("http");
          return (
            <li key={link.id}>
              {link.url ? (
                <a
                  href={link.url}
                  className={itemClass}
                  aria-label={`${link.label}: ${link.value}${external ? " (opens in a new tab)" : ""}`}
                  {...(external && { target: "_blank", rel: "noreferrer" })}
                >
                  {icon}
                </a>
              ) : (
                <button
                  type="button"
                  className={itemClass}
                  aria-label={`Copy ${link.label} ${link.value}`}
                  onClick={() => copy(link)}
                >
                  {copied === link.id ? <Check /> : icon}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p role="status" className="sr-only">
        {copied ? "Copied to the clipboard" : ""}
      </p>
    </>
  );
}
