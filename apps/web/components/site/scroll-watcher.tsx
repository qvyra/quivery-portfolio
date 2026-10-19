"use client";

import { useEffect, useRef } from "react";

/**
 * Sets `data-scrolled` on <html> once the page leaves the top, for the
 * header's `scrolled:` styles. Watches a sentinel, so no scroll listener
 */
export function ScrollWatcher() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = ref.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(([entry]) => {
      document.documentElement.dataset.scrolled = String(
        !(entry?.isIntersecting ?? true),
      );
    });
    io.observe(sentinel);
    return () => {
      io.disconnect();
      delete document.documentElement.dataset.scrolled;
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-2"
    />
  );
}
