// Particles: small plain dots drifting behind the page like a calm star
// field, fading in and out, with depth (smaller, dimmer and slower is
// farther). The field leans toward the mouse, or follows scrolling a little
// on touch screens. One canvas and a filled circle per dot, no glow
import { brand, effectsConfig } from "./config";
import { hasFinePointer, type EffectsTier } from "./tier";

const config = effectsConfig.particles;
// dots wrap around this far past the edges, so none pops in or out
const MARGIN = 20;
// frame-rate checks every this many ms, after a first quiet one
const WINDOW = 2000;

type Particle = {
  x: number;
  y: number;
  /** 0 far to 1 near */
  z: number;
  vx: number;
  vy: number;
  /** Its own peak brightness, so the field isn't uniform */
  glint: number;
  period: number;
  phase: number;
  tint: number;
};

function mix(hex: string, amount: number) {
  const channel = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const rgb = [0, 1, 2].map((i) =>
    Math.round(channel(i) + (255 - channel(i)) * amount),
  );
  return `rgb(${rgb.join(" ")})`;
}

// purple, pink and lilac, each mostly white
const tints = () =>
  [brand.orchid, brand.rose, brand.focus].map((hex) =>
    mix(hex, config.whiteness),
  );

const random = (min: number, max: number) => min + Math.random() * (max - min);

function spawn(width: number, height: number, count: number): Particle[] {
  return (
    Array.from({ length: count }, () => {
      // more far ones than near ones, like a real field
      const z = Math.random() ** 1.6;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * (width + MARGIN * 2) - MARGIN,
        y: Math.random() * (height + MARGIN * 2) - MARGIN,
        z,
        vx: Math.cos(angle),
        vy: Math.sin(angle) * 0.6 - 0.25,
        glint: random(config.glint, 1),
        period: random(config.fade.min, config.fade.max) * 1000,
        phase: Math.random(),
        tint: Math.floor(Math.random() * 3),
      };
    })
      // grouped by tint, so each frame sets the fill colour three times
      .sort((a, b) => a.tint - b.tint)
  );
}

const wrap = (value: number, size: number) =>
  ((((value + MARGIN) % (size + MARGIN * 2)) + size + MARGIN * 2) %
    (size + MARGIN * 2)) -
  MARGIN;

/** Starts the field on a canvas. Returns a function that stops it */
export function startParticles(
  canvas: HTMLCanvasElement,
  tier: Exclude<EffectsTier, "off">,
  calm: boolean,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const colours = tints();
  const fine = hasFinePointer();
  const brightness = config.brightness * (calm ? config.calm.brightness : 1);
  let count = Math.round(config.count[tier] * (calm ? config.calm.count : 1));
  let width = 0;
  let height = 0;
  let dots: Particle[] = [];

  const resize = () => {
    // sharp enough for dots this small, without the fill cost of 3x
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (dots.length === 0) dots = spawn(width, height, count);
  };
  resize();

  // parallax target and eased position, in px for the nearest layer
  const target = { x: 0, y: 0 };
  const shift = { x: 0, y: 0 };
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    target.x = (event.clientX / width - 0.5) * -2 * config.parallax;
    target.y = (event.clientY / height - 0.5) * -2 * config.parallax;
  };
  const onScroll = () => {
    target.y = -window.scrollY * config.scrollParallax;
  };

  let frame = 0;
  let last = 0;
  let windowStart = 0;
  let frames = 0;
  let checks = 0;

  const draw = (now: number) => {
    frame = requestAnimationFrame(draw);
    // long gaps (a background tab, a debugger) shouldn't fling them across
    const dt = Math.min(now - (last || now), 50) / 1000;
    last = now;

    // a device that can't keep up gets fewer dots, then none
    frames += 1;
    if (!windowStart) windowStart = now;
    if (now - windowStart >= WINDOW) {
      const fps = (frames * 1000) / (now - windowStart);
      // the first window overlaps page load, so it doesn't count
      if (checks > 0 && fps < config.minFps) {
        count = Math.floor(count * 0.7);
        dots = dots.filter((_, index) => index % 10 < 7).slice(0, count);
        if (count < 6) {
          stop();
          return;
        }
      }
      checks += 1;
      frames = 0;
      windowStart = now;
    }

    shift.x += (target.x - shift.x) * config.ease;
    shift.y += (target.y - shift.y) * config.ease;
    ctx.clearRect(0, 0, width, height);
    let tint = -1;
    for (const dot of dots) {
      const speed = config.drift * (0.25 + 0.75 * dot.z);
      dot.x = wrap(dot.x + dot.vx * speed * dt, width);
      dot.y = wrap(dot.y + dot.vy * speed * dt, height);
      const fade =
        0.5 -
        0.5 * Math.cos(((now / dot.period + dot.phase) % 1) * Math.PI * 2);
      const alpha = brightness * dot.glint * (0.3 + 0.7 * dot.z) * fade;
      if (alpha < 0.01) continue;
      if (dot.tint !== tint) {
        tint = dot.tint;
        ctx.fillStyle = colours[tint]!;
      }
      const r =
        config.radius.far + (config.radius.near - config.radius.far) * dot.z;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(
        wrap(dot.x + shift.x * dot.z, width),
        wrap(dot.y + shift.y * dot.z, height),
        r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const play = () => {
    if (frame || document.visibilityState !== "visible") return;
    last = 0;
    windowStart = 0;
    frames = 0;
    frame = requestAnimationFrame(draw);
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const onVisibility = () =>
    document.visibilityState === "visible" ? play() : pause();

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  if (fine)
    window.addEventListener("pointermove", onPointer, { passive: true });
  else window.addEventListener("scroll", onScroll, { passive: true });
  play();

  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    pause();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    ctx?.clearRect(0, 0, width, height);
  }
  return stop;
}
