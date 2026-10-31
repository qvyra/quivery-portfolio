// A soft light behind the page that trails the mouse. The cursor itself is
// untouched. Moves by transform, and its loop stops once it has caught up
import { effectsConfig } from "./config";

const { size, ease } = effectsConfig.cursorGlow;

/** Starts the glow on its element. Returns a function that stops it */
export function startCursorGlow(glow: HTMLElement): () => void {
  const target = { x: 0, y: 0 };
  const at = { x: 0, y: 0 };
  let frame = 0;
  let seen = false;
  const place = () => {
    glow.style.transform = `translate3d(${at.x - size / 2}px, ${at.y - size / 2}px, 0)`;
  };
  const step = () => {
    at.x += (target.x - at.x) * ease;
    at.y += (target.y - at.y) * ease;
    place();
    frame =
      Math.abs(target.x - at.x) + Math.abs(target.y - at.y) > 0.5
        ? requestAnimationFrame(step)
        : 0;
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    target.x = event.clientX;
    target.y = event.clientY;
    if (!seen) {
      // the first move places it without a glide in from the corner
      seen = true;
      at.x = target.x;
      at.y = target.y;
      place();
      glow.style.opacity = "1";
    }
    if (!frame) frame = requestAnimationFrame(step);
  };
  const onLeave = () => {
    glow.style.opacity = "0";
    seen = false;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    glow.style.opacity = "0";
  };
}
