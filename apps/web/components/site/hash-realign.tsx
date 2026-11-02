// A page opened at a #hash smooth scrolls to its target while the page is
// still settling. If Poppins swaps in during that scroll, text above the
// target re-wraps and it ends up a few lines off. Once fonts are in and the
// scroll has stopped, this puts the target back where the browser meant it
// to land, once, without animating. Any sign of the reader taking over
// (wheel, touch, pointer, key) cancels it for good

// runs as an inline script, so it has to stand alone: no imports, no
// closures over module scope
function realignHash() {
  const nav = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  // a reload or back/forward restores the reader's own position instead
  if (!location.hash || (nav && nav.type !== "navigate")) return;
  let id: string;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }

  let cancelled = false;
  const inputs = ["wheel", "touchstart", "pointerdown", "keydown"];
  const options = { capture: true, passive: true };
  const cancel = () => {
    cancelled = true;
    for (const type of inputs) removeEventListener(type, cancel, options);
  };
  for (const type of inputs) addEventListener(type, cancel, options);

  // the browser's own smooth scroll has stopped once scrollY holds still
  // for a few frames
  const settled = () =>
    new Promise<void>((resolve) => {
      let last = scrollY;
      let still = 0;
      const check = () => {
        if (scrollY !== last) {
          last = scrollY;
          still = 0;
        } else if (++still >= 6) {
          return resolve();
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });

  const realign = () => {
    const target = document.getElementById(id);
    if (cancelled || !target) return;
    const want =
      (parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      ) || 0) + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    const off = target.getBoundingClientRect().top - want;
    const root = document.documentElement;
    const atBottom = off > 0 && scrollY + innerHeight >= root.scrollHeight - 1;
    // a re-wrap moves it a few lines, anything more is the reader's doing
    // (dragging the scrollbar sends no input event)
    if (Math.abs(off) <= 4 || atBottom || Math.abs(off) > innerHeight / 2) {
      return;
    }
    target.scrollIntoView({ block: "start", behavior: "instant" });
  };

  addEventListener(
    "load",
    () => {
      const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
      void Promise.race([document.fonts.ready, timeout])
        .then(settled)
        .then(realign)
        .finally(cancel);
    },
    { once: true },
  );
}

/** Inline, so it's listening before the page's own scripts load */
export function HashRealign() {
  return (
    <script
      // the function's own source, run straight away
      dangerouslySetInnerHTML={{ __html: `(${realignHash.toString()})()` }}
    />
  );
}
