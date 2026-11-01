"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { effectsConfig } from "@/lib/effects/config";
import { effectsTier, whenIdle } from "@/lib/effects/tier";

/**
 * Starts the ambient effects (particles, cursor light, spotlight) once the
 * page has loaded and the main thread is idle. Their code loads only then,
 * nothing runs under reduced motion, and content-heavy pages get a calmer
 * field
 */
export function Effects() {
  const pathname = usePathname();
  const calm = effectsConfig.particles.calmPaths.some((path) =>
    path.test(pathname),
  );

  useEffect(() => {
    let stop: (() => void) | undefined;
    let live = true;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = async () => {
      stop?.();
      stop = undefined;
      const tier = effectsTier();
      if (tier === "off") return;
      const { startAmbient } = await import("@/lib/effects/ambient");
      if (live) stop = startAmbient(tier, calm);
    };
    const cancel = whenIdle(() => void start());
    // turning reduced motion on stops them at once, off starts them
    const onChange = () => void start();
    motion.addEventListener("change", onChange);
    return () => {
      live = false;
      cancel();
      motion.removeEventListener("change", onChange);
      stop?.();
    };
  }, [calm]);

  return null;
}
