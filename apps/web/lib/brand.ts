// Brand artwork, so swapping an image only touches this file

export type BrandImage = { src: string; width: number; height: number };

/** Header logo, the wordmark without the "Independent development" line */
export const wordmark: BrandImage = {
  src: "/brand/quivery-wordmark.png",
  width: 523,
  height: 216,
};

/** Full lockup, for places big enough to read its small second line */
export const fullLogo: BrandImage = {
  src: "/brand/quivery-logo.png",
  width: 523,
  height: 288,
};

// A sharper or vector Q goes in public/brand/: point still at it with its size
// and set animated to the new animation, or null for a still-only mark. SVGs
// skip the image optimizer and are served as they are
/** The highlighted Q in the hero frame */
export const heroArt: { still: BrandImage; animated: string | null } = {
  // first frame of the animation. Loads first and is the LCP image
  still: { src: "/brand/hero-logo-poster.webp", width: 580, height: 580 },
  // 2 MB animated WebP, fetched only after the page has loaded
  animated: "/brand/hero-logo.webp",
};
