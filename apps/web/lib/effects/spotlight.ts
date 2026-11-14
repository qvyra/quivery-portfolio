// A soft light following the mouse across buttons and cards, on the surface
// and brighter along the border. CMS images (.image-frame) only get the
// border light, nothing is laid over the picture. The layers are added on
// first hover, so pages ship no markup for them. Styles are .spotlight in
// globals.css
import { brand, effectsConfig } from "./config";

const SURFACE = ".btn, [data-spotlight]";
const TARGETS = `${SURFACE}, .image-frame`;
const { size, strength, edge } = effectsConfig.spotlight;

const EDGE = ":scope > .spotlight-edge";
const FILL = ":scope > .spotlight:not(.spotlight-edge)";

function layer(element: HTMLElement, selector: string, className: string) {
  const found = element.querySelector<HTMLElement>(selector);
  if (found) return found;
  const span = document.createElement("span");
  span.className = className;
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = '<span class="spotlight-light"></span>';
  element.append(span);
  return span;
}

// the surface light under the content and the border light over it, both
// moved by transform
function lightsOf(element: HTMLElement) {
  const layers = [layer(element, EDGE, "spotlight spotlight-edge")];
  if (element.matches(SURFACE)) layers.push(layer(element, FILL, "spotlight"));
  return layers.map((l) => l.firstElementChild as HTMLElement);
}

// a card's cover, which the surface light stays below so it never tints the
// picture, even a transparent one or one still loading
function clearOf(element: HTMLElement) {
  return element.querySelector<HTMLElement>(":scope > [data-spot-clear]");
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
  let clear: HTMLElement | null = null;
  let frame = 0;
  let point = { x: 0, y: 0 };
  const place = () => {
    frame = 0;
    if (!current) return;
    const box = current.getBoundingClientRect();
    const transform = `translate3d(${point.x - box.left - size / 2}px, ${point.y - box.top - size / 2}px, 0)`;
    for (const light of lights) light.style.transform = transform;
    if (clear) {
      const below = clear.getBoundingClientRect().bottom - box.top;
      const surface = current.querySelector<HTMLElement>(FILL);
      if (surface) surface.style.clipPath = `inset(${below}px 0 0 0)`;
    }
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
      clear = current ? clearOf(current) : null;
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
