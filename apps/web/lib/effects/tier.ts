// How much ambient motion this device gets. Picked once from what the
// browser says about the visitor and the hardware, so a slow phone gets a
// lighter version instead of a janky one

export type EffectsTier = "off" | "low" | "medium" | "high";

type Connection = { saveData?: boolean; effectiveType?: string };

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A mouse or trackpad that can hover, where the cursor effects make sense */
export const hasFinePointer = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export function effectsTier(): EffectsTier {
  if (typeof window === "undefined" || prefersReducedMotion()) return "off";
  const nav = navigator as Navigator & {
    connection?: Connection;
    deviceMemory?: number;
  };
  // visitors who asked to save data or are on a slow link get the least
  if (
    nav.connection?.saveData ||
    /^(slow-2g|2g)$/.test(nav.connection?.effectiveType ?? "")
  ) {
    return "low";
  }
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  if (cores <= 2 || memory <= 2) return "low";
  // phones and tablets stay at medium for their battery
  if (cores >= 8 && memory >= 8 && hasFinePointer()) return "high";
  return cores <= 4 || memory <= 4 ? "low" : "medium";
}

/** Runs after the page has loaded and the main thread is idle */
export function whenIdle(run: () => void): () => void {
  let idle: number | undefined;
  let timer: number | undefined;
  const schedule = () => {
    // Safari has no requestIdleCallback
    if (typeof window.requestIdleCallback === "function") {
      idle = window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      timer = setTimeout(run, 200) as unknown as number;
    }
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    window.removeEventListener("load", schedule);
    if (idle !== undefined) window.cancelIdleCallback(idle);
    if (timer !== undefined) clearTimeout(timer);
  };
}
