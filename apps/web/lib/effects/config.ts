// Every ambient effect's intensity, in one place. Each number is a plain dial:
// "particles 30% dimmer" is particles.brightness * 0.7. Colours are the
// brand's own (globals.css), never new ones

/** Brand colours from globals.css, the only hues the effects use */
export const brand = {
  orchid: "#dc00ff", // --color-orchid
  rose: "#c2005a", // --color-rose
  focus: "#f5b8ff", // --color-focus
  plum: "#79018c", // --color-plum
} as const;

export const effectsConfig = {
  particles: {
    /** How many, per effects tier (see tier.ts) */
    count: { high: 120, medium: 80, low: 40 },
    /** Count and brightness on content-heavy pages, as a share of normal */
    calm: { count: 0.5, brightness: 0.6 },
    /** Paths that get the calm field */
    calmPaths: [/\/benchmarks(\/|$)/],
    /** Peak opacity of the nearest, brightest dot, 0 to 1 */
    brightness: 0.9,
    /** Dimmest a dot's own peak gets, as a share of the brightest */
    glint: 0.5,
    /** Radius in px of the farthest and the nearest */
    radius: { far: 0.6, near: 1.6 },
    /** Drift speed of the nearest, in px per second. Farther ones are slower */
    drift: 7,
    /** Seconds for one fade in and out, a random pick in this range */
    fade: { min: 5, max: 11 },
    /** How far the field shifts toward the mouse at the window's edge, px */
    parallax: 22,
    /** Touch: px the nearest layer moves per px scrolled */
    scrollParallax: 0.05,
    /** Share of the remaining distance the parallax covers per frame */
    ease: 0.05,
    /** How close to white the tints are, 0 (brand colour) to 1 (white) */
    whiteness: 0.8,
    /** Under this frame rate the field thins out, then stops */
    minFps: 45,
  },
  cursorGlow: {
    /** Diameter in px */
    size: 280,
    /** Opacity at the centre, 0 to 1 */
    strength: 0.065,
    ease: 0.14,
  },
  spotlight: {
    /** Diameter in px of the light under the mouse */
    size: 300,
    /** Opacity across the surface */
    strength: 0.14,
    /** Opacity along the border */
    edge: 0.7,
  },
  heroTilt: {
    /** Most the Q tilts toward the mouse, in degrees */
    angle: 6,
    /** Lowest effects tier that tilts the Q (hover and tap). The light's
     travel, follow and morph run on every tier */
    minTier: "medium" as "low" | "medium" | "high",
    perspective: 900,
    ease: 0.1,
    /**
     * On entering the frame the light carries on forward to the cursor's
     * angle in this many ms: min for a short hop, max for nearly a lap
     */
    travel: { min: 200, max: 700 },
    /** How tightly the light then follows the cursor. Higher is snappier */
    follow: 12,
    /** ms the light takes to change between comet and glow, both ways */
    morph: 300,
    /** Touch: how long a tap's tilt holds before settling back, ms */
    glance: 900,
  },
  countUp: {
    /** One stat's count, ms */
    duration: 1600,
  },
} as const;
