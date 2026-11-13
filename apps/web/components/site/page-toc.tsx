"use client";

import { useEffect, useRef, useState } from "react";
import type { OutlineEntry } from "@/lib/outline";

// the rail only shows from this width (Tailwind's xl), so it measures nothing
// below it
const WIDE_SCREEN = "(min-width: 1280px)";

/**
 * "On this page": links to the page's headings, sticky beside the text
 * column. The heading being read is highlighted, and the rail steps aside
 * while a wide block (which spans its column) scrolls past it
 */
export function PageToc({ entries }: { entries: OutlineEntry[] }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [covered, setCovered] = useState(false);
  const key = entries.map((entry) => entry.id).join(" ");

  useEffect(() => {
    const rail = ref.current;
    const screen = window.matchMedia(WIDE_SCREEN);
    const headings = key
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const body = rail?.closest("[data-page-body]");
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (!rail || !screen.matches) return;
      // the last heading above a line a third of the way down the screen
      const line = innerHeight / 3;
      let current: string | null = null;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= line) current = heading.id;
      }
      setActive(current);
      const box = rail.getBoundingClientRect();
      // looked up each time, since the admin preview changes text widths live
      const wide = body?.querySelectorAll(
        "[data-wide], [data-text-width=full]",
      );
      setCovered(
        [...(wide ?? [])].some((el) => {
          const block = el.getBoundingClientRect();
          return block.top < box.bottom && block.bottom > box.top;
        }),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    screen.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      screen.removeEventListener("change", schedule);
    };
  }, [key]);

  return (
    <nav
      ref={ref}
      aria-label="On this page"
      data-covered={covered || undefined}
      className="page-toc"
    >
      <p className="text-eyebrow font-semibold text-white/55 uppercase">
        On this page
      </p>
      <ol className="mt-4 space-y-1 border-l border-white/10">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={active === entry.id ? "location" : undefined}
              className="page-toc-link"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
