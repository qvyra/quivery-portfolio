// Every ambient effect behind one import, so all of it is a single chunk the
// browser fetches once the page is idle, never ahead of the page's content
import { startCursorGlow } from "./cursor-glow";
import { startParticles } from "./particles";
import { startSpotlight } from "./spotlight";
import { hasFinePointer, type EffectsTier } from "./tier";

export { heroGaze } from "./hero-gaze";

/** Starts the backdrop's effects for a tier. Returns a function that stops them */
export function startAmbient(
  tier: Exclude<EffectsTier, "off">,
  calm: boolean,
): () => void {
  const stops: (() => void)[] = [];
  const canvas = document.querySelector<HTMLCanvasElement>("[data-particles]");
  if (canvas) {
    stops.push(startParticles(canvas, tier, calm));
    canvas.style.opacity = "1";
  }
  // the cursor effects need a mouse or trackpad
  if (hasFinePointer()) {
    const glow = document.querySelector<HTMLElement>("[data-cursor-glow]");
    if (glow) stops.push(startCursorGlow(glow));
    stops.push(startSpotlight());
  }
  return () => {
    for (const stop of stops) stop();
    if (canvas) canvas.style.opacity = "0";
  };
}
