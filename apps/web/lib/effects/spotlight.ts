// A soft light following the mouse across buttons and cards, on the surface
// and brighter along the border. The layer is added on first hover, so pages
// ship no markup for it. Styles are .spotlight in globals.css
import { brand, effectsConfig } from "./config";

const TARGETS = ".btn, [data-spotlight]";
const { size, strength, edge } = effectsConfig.spotlight;

// one light for the surface and one masked to the border, both moved by
// transform
function lightsOf(element: HTMLElement) {
  let layer = element.querySelector<HTMLElement>(":scope > .spotlight");
  if (!layer) {
    layer = document.createElement("span");
    layer.className = "spotlight";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML =
      '<span class="spotlight-light"></span><span class="spotlight-edge"><span class="spotlight-light"></span></span>';
    element.append(layer);
  }
  return [...layer.querySelectorAll<HTMLElement>(".spotlight-light")];
}

/** Starts the spotlight. Returns a function that stops it */
export function startSpotlight(): () => void {
  const root = document.documentElement.style;
  root.setProperty("--spot-size", `${size}px`);
  root.setProperty(
    "--spot-fill",
    `color-mix(in srgb, ${brand.orchid} ${strength * 100}%, transparent)`,
  );
  root.setProperty(
    "--spot-edge",
    `color-mix(in srgb, ${brand.focus} ${edge * 100}%, transparent)`,
  );

  let current: HTMLElement | null = null;
  let lights: HTMLElement[] = [];
  let frame = 0;
  let point = { x: 0, y: 0 };
  const place = () => {
    frame = 0;
    if (!current) return;
    const box = current.getBoundingClientRect();
    const transform = `translate3d(${point.x - box.left - size / 2}px, ${point.y - box.top - size / 2}px, 0)`;
    for (const light of lights) light.style.transform = transform;
    // shown after the first placement, so it never flashes at a corner
    current.setAttribute("data-spot", "");
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const target = (event.target as Element | null)?.closest<HTMLElement>(
      TARGETS,
    );
    if (target !== current) {
      current?.removeAttribute("data-spot");
      current = target ?? null;
      lights = current ? lightsOf(current) : [];
    }
    if (!current) return;
    point = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(place);
  };
  const onLeave = () => {
    current?.removeAttribute("data-spot");
    current = null;
  };
  document.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  return () => {
    cancelAnimationFrame(frame);
    document.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    onLeave();
  };
}
