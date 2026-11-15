// `sizes` hints for CMS images, worked out from the layout so the browser
// picks the smallest file that still fills the box. They follow <Container>:
// 80rem wide at most, less a side gutter of clamp(1rem, 0.4rem + 3vw, 2.5rem).
// That gutter is 0.4rem + 3vw up to 1120px and 2.5rem from there, so the
// content box is 94vw - 0.8rem, then 100vw - 5rem, then 75rem from 1280px.
// The scrollbar is left out, which overshoots by a few pixels at most

const container = [
  "(min-width: 1280px) 75rem",
  "(min-width: 1120px) calc(100vw - 5rem)",
  "calc(94vw - 0.8rem)",
];

// where 94vw - 0.8rem reaches the 60rem text column
const COLUMN_FROM = "1035px";

/** The page's full content width: project headers, wide images */
export const PAGE_SIZES = container.join(", ");

/** An image capped at the 60rem column of a page or project */
export const COLUMN_SIZES = [
  `(min-width: ${COLUMN_FROM}) 60rem`,
  "calc(94vw - 0.8rem)",
].join(", ");

/** One of a gallery's two columns (1rem apart), in the 60rem column */
export const COLUMN_GALLERY_SIZES = [
  `(min-width: ${COLUMN_FROM}) 29.5rem`,
  "(min-width: 640px) calc(47vw - 0.9rem)",
  "calc(94vw - 0.8rem)",
].join(", ");

/** One of a gallery's two columns at the page's full width (sections) */
export const PAGE_GALLERY_SIZES = [
  "(min-width: 1280px) 37rem",
  "(min-width: 1120px) calc(50vw - 3rem)",
  "(min-width: 640px) calc(47vw - 0.9rem)",
  "calc(94vw - 0.8rem)",
].join(", ");

/** A flagship project card, two to a row (1.5rem apart) from 1024px */
export const FLAGSHIP_CARD_SIZES = [
  "(min-width: 1280px) 36.75rem",
  "(min-width: 1120px) calc(50vw - 3.25rem)",
  "(min-width: 1024px) calc(47vw - 1.15rem)",
  "calc(94vw - 0.8rem)",
].join(", ");

/** A project card, two to a row from 640px and three from 1024px */
export const CARD_SIZES = [
  "(min-width: 1280px) 24rem",
  "(min-width: 1120px) calc(33.3vw - 2.67rem)",
  "(min-width: 1024px) calc(31.3vw - 1.27rem)",
  "(min-width: 640px) calc(47vw - 1.15rem)",
  "calc(94vw - 0.8rem)",
].join(", ");

/**
 * The hero's logo, 82% of the hero mark (inset 9%). The mark is the content
 * width up to 26rem, then from 1024px 0.9 of 1.1fr + 0.9fr columns 4rem apart,
 * at most 34rem. Its height cap (62svh) only matters on short screens and is
 * left out
 */
export const HERO_MARK_SIZES = [
  "(min-width: 1280px) 26.2rem",
  "(min-width: 1120px) calc(36.9vw - 3.32rem)",
  "(min-width: 1024px) calc(34.69vw - 1.77rem)",
  "(min-width: 457px) 21.32rem",
  "calc(77.08vw - 0.66rem)",
].join(", ");

/** A phone version below 640px, where every image box is the content width */
export const PHONE_SIZES = "calc(94vw - 0.8rem)";
