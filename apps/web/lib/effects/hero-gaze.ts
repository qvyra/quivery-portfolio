// The hero Q noticing the visitor. With the mouse inside the frame the Q
// tilts toward it, and the orbiting comet turns into an even glow while it
// carries on forward round the border to the cursor's angle, then follows
// the cursor either way. On leaving, the tilt eases back and the glow turns
// back into the comet, which carries on orbiting from where it is. On touch
// a tap only tilts the Q: the light keeps orbiting, so the page never looks
// stuck. Below heroTilt.minTier the Q doesn't tilt at all, since redrawing
// its blurred layers tilted is the costly part, and the light stays as is
import { effectsConfig } from "./config";
import type { EffectsTier } from "./tier";

const {
  angle: maxTilt,
  perspective,
  ease,
  follow: stiffness,
  travel,
  morph,
  glance,
  minTier,
} = effectsConfig.heroTilt;
const TIERS = ["low", "medium", "high"] as const;
// one orbit, same as the orbit animation on .hero-mark-beam
const ORBIT_MS = 7000;
const ORBIT_SPEED = 360 / ORBIT_MS;
// the comet's head and the glow's centre sit at 0.75turn of their gradients
const LIGHT_OFFSET = 270;
// closer than this the light has arrived, in degrees
const NEAR = 1;
// a retarget smaller than this leaves the travel as it is
const RETARGET = 2;

// the beam's rotation right now, from its running animation
function currentRotation(beam: HTMLElement) {
  const { transform } = getComputedStyle(beam);
  const match = /matrix\(([^,]+),\s*([^,]+)/.exec(transform);
  if (!match) return 0;
  return (Math.atan2(Number(match[2]), Number(match[1])) * 180) / Math.PI;
}

// the shortest way round from one angle to another, in degrees
const turn = (from: number, to: number) =>
  ((((to - from) % 360) + 540) % 360) - 180;
// the way round going forward (clockwise, the orbit's way), 0 to 360
const ahead = (from: number, to: number) => (((to - from) % 360) + 360) % 360;

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

// A travel is one curve from where the light is, at the speed it already
// has, to a stop at the cursor. The distance part speeds up quickly and
// spends most of the time slowing down, the speed part carries the starting
// speed in and fades it out. Neither moves the ends, so position and speed
// stay continuous when a travel starts or is retargeted
const reach = (s: number) => 1 - (1 - s) ** 3 * (1 + 3 * s);
const reachRate = (s: number) => 12 * s * (1 - s) ** 2;
const carry = (s: number) => s * (1 - s) ** 3;
const carryRate = (s: number) => (1 - s) ** 2 * (1 - 4 * s);

type Travel = {
  start: number;
  from: number;
  /** Degrees per ms when it starts */
  speed: number;
  distance: number;
  duration: number;
};

function travelAt(trip: Travel, now: number) {
  const s = Math.min(1, Math.max(0, (now - trip.start) / trip.duration));
  const { from, speed, distance, duration } = trip;
  return {
    s,
    at: from + speed * duration * carry(s) + distance * reach(s),
    speed:
      (speed * duration * carryRate(s) + distance * reachRate(s)) / duration,
  };
}

// a short hop is quick, nearly a lap takes longer at a higher speed. The
// curve only ever moves forward while speed * duration <= 4 * distance
function plan(start: number, from: number, speed: number, distance: number) {
  const scaled = travel.min + ((travel.max - travel.min) * distance) / 360;
  const duration =
    speed > 0 ? Math.min(scaled, (4 * distance) / speed) : scaled;
  return { start, from, speed, distance, duration };
}

/** Wires up a hero mark. Returns a function that undoes it */
export function heroGaze(
  frame: HTMLElement,
  tilt: HTMLElement,
  beam: HTMLElement,
  tier: Exclude<EffectsTier, "off">,
): () => void {
  const tilts = TIERS.indexOf(tier) >= TIERS.indexOf(minTier);
  // orbit: the CSS animation runs it. travel: going forward to the cursor.
  // follow: a damped spring keeps it on the cursor, the shortest way round
  let mode: "orbit" | "travel" | "follow" = "orbit";
  let rotation = 0;
  /** Degrees per second while following */
  let velocity = 0;
  let trip: Travel | null = null;
  /** Where the cursor puts the light, in the beam's rotation */
  let goal = 0;
  const target = { x: 0, y: 0 };
  const now = { x: 0, y: 0 };
  let loop = 0;
  let last = 0;
  let glanceTimer = 0;
  beam.style.setProperty("--hero-morph", `${morph}ms`);

  // where the pointer is from the frame's centre, -1 to 1 each way
  const offset = (event: PointerEvent) => {
    const box = frame.getBoundingClientRect();
    return {
      dx: (event.clientX - (box.left + box.width / 2)) / (box.width / 2),
      dy: (event.clientY - (box.top + box.height / 2)) / (box.height / 2),
    };
  };
  const aimTilt = (dx: number, dy: number) => {
    if (!tilts) return;
    target.x = -clamp(dy) * maxTilt;
    target.y = clamp(dx) * maxTilt;
  };
  // clockwise from the top, the same way the conic gradient counts
  const lightFor = (dx: number, dy: number) =>
    (Math.atan2(dx, -dy) * 180) / Math.PI - LIGHT_OFFSET;

  const toFollow = (at: number, speed: number) => {
    mode = "follow";
    trip = null;
    rotation = at;
    velocity = speed * 1000;
  };

  const aimLight = (dx: number, dy: number, time: number) => {
    goal = lightFor(dx, dy);
    if (mode !== "travel" || !trip) return;
    const end = trip.from + trip.distance;
    if (Math.abs(turn(end, goal)) < RETARGET) return;
    const { at, speed } = travelAt(trip, time);
    const left = end - at;
    const forward = ahead(at, goal);
    // the cursor went back past the light: it has reached it, so the spring
    // takes over from here, carrying the light's speed
    if (forward > left + 180 || forward < NEAR) {
      toFollow(at, speed);
      return;
    }
    trip = plan(time, at, speed, forward);
  };

  const step = (time: number) => {
    const dt = Math.min(time - (last || time), 50) / 1000;
    last = time;
    if (mode === "travel" && trip) {
      const { s, at, speed } = travelAt(trip, time);
      rotation = at;
      if (s >= 1) toFollow(at, speed);
    } else if (mode === "follow") {
      // critically damped, so it settles on the cursor without wobbling
      const offBy = turn(rotation, goal);
      velocity += (stiffness ** 2 * offBy - 2 * stiffness * velocity) * dt;
      rotation += velocity * dt;
    }
    if (mode !== "orbit") beam.style.transform = `rotate(${rotation}deg)`;
    now.x += (target.x - now.x) * ease;
    now.y += (target.y - now.y) * ease;
    if (tilts) {
      tilt.style.transform = `perspective(${perspective}px) rotateX(${now.x}deg) rotateY(${now.y}deg)`;
    }
    const settled =
      mode === "orbit" &&
      Math.abs(target.x - now.x) < 0.01 &&
      Math.abs(target.y - now.y) < 0.01;
    if (settled) {
      // a tap's tilt holds until its timer sets the target back to level
      if (target.x === 0 && target.y === 0) {
        tilt.style.transform = "";
        tilt.style.willChange = "";
      }
      loop = 0;
      return;
    }
    loop = requestAnimationFrame(step);
  };
  const run = () => {
    if (tilts) tilt.style.willChange = "transform";
    if (!loop) {
      last = 0;
      loop = requestAnimationFrame(step);
    }
  };

  // take over from the orbit at the light's current angle, turn the comet
  // into the glow and set off forward to the cursor
  const engage = (dx: number, dy: number) => {
    if (mode !== "orbit") return;
    const time = performance.now();
    rotation = currentRotation(beam);
    beam.style.animation = "none";
    beam.style.transform = `rotate(${rotation}deg)`;
    beam.setAttribute("data-gaze", "");
    goal = lightFor(dx, dy);
    const forward = ahead(rotation, goal);
    if (forward < NEAR) {
      toFollow(rotation, ORBIT_SPEED);
      return;
    }
    mode = "travel";
    trip = plan(time, rotation, ORBIT_SPEED, forward);
  };
  const release = () => {
    if (mode === "orbit") return;
    mode = "orbit";
    trip = null;
    target.x = 0;
    target.y = 0;
    // the orbit resumes from here (a negative delay starts it part way
    // round) while the glow turns back into the comet
    const at = ((rotation % 360) + 360) % 360;
    beam.style.transform = "";
    beam.style.animation = "";
    beam.style.animationDelay = `${(-at / 360) * ORBIT_MS}ms`;
    beam.removeAttribute("data-gaze");
    run();
  };

  const onEnter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const { dx, dy } = offset(event);
    engage(dx, dy);
    aimTilt(dx, dy);
    run();
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || mode === "orbit") return;
    const { dx, dy } = offset(event);
    aimLight(dx, dy, performance.now());
    aimTilt(dx, dy);
  };
  const onLeave = (event: PointerEvent) => {
    if (event.pointerType === "mouse") release();
  };
  const onTap = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || !tilts) return;
    window.clearTimeout(glanceTimer);
    const { dx, dy } = offset(event);
    aimTilt(dx, dy);
    run();
    glanceTimer = window.setTimeout(() => {
      target.x = 0;
      target.y = 0;
      run();
    }, glance);
  };

  frame.addEventListener("pointerenter", onEnter);
  frame.addEventListener("pointermove", onMove);
  frame.addEventListener("pointerleave", onLeave);
  frame.addEventListener("pointerup", onTap);
  return () => {
    frame.removeEventListener("pointerenter", onEnter);
    frame.removeEventListener("pointermove", onMove);
    frame.removeEventListener("pointerleave", onLeave);
    frame.removeEventListener("pointerup", onTap);
    window.clearTimeout(glanceTimer);
    cancelAnimationFrame(loop);
    loop = 0;
    mode = "orbit";
    beam.removeAttribute("data-gaze");
    beam.style.animation = "";
    beam.style.transform = "";
    tilt.style.transform = "";
    tilt.style.willChange = "";
  };
}
