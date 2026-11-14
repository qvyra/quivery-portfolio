import type { Media } from "@repo/shared";
import { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import { preload } from "react-dom";

// in px, like the phone rule for .art-image in globals.css, so a larger
// default font size can't pull the two apart
const PHONE = "(max-width: 639px)";
const WIDER = "(min-width: 640px)";

// a file with no recorded size is letterboxed into 16:9
const shape = (media: Media) =>
  media.width && media.height
    ? { width: media.width, height: media.height }
    : { width: 1600, height: 900 };

/**
 * One image with an optional phone version below 640px, each in its own
 * shape so swapping between them can't shift the layout. The browser only
 * downloads the version on screen. With `priority` (the page's main image)
 * each version is also preloaded, but only on the screens that show it
 */
export function ArtPicture({
  main,
  phone,
  sizes,
  phoneSizes,
  priority = false,
  className,
}: {
  main: Media;
  phone: Media | null;
  sizes: string;
  phoneSizes: string;
  /** Only for the page's main (LCP) image, everything else loads lazily */
  priority?: boolean;
  className: string;
}) {
  const optimized = (media: Media, sizes: string) =>
    getImageProps({
      src: media.url,
      // the phone version shares it, a <source> has no alt of its own
      alt: main.alt,
      sizes,
      ...shape(media),
      ...(priority && { loading: "eager", fetchPriority: "high" }),
      // the optimizer only handles raster images, SVGs are served as-is
      unoptimized: media.mimeType === "image/svg+xml",
    }).props;
  const img = optimized(main, sizes);
  const source = phone && optimized(phone, phoneSizes);

  if (priority) {
    // next/image's own preload can't be scoped to a screen size, and an
    // unscoped one would fetch both versions
    const early = (version: typeof img, media: string | undefined) =>
      preload(version.src, {
        as: "image",
        fetchPriority: "high",
        imageSrcSet: version.srcSet,
        imageSizes: version.sizes,
        media,
      });
    early(img, source ? WIDER : undefined);
    if (source) early(source, PHONE);
  }

  const ratio = (media: Media) => shape(media).width / shape(media).height;
  // picked by .art-image for the version on screen
  const ratios = {
    "--ratio-main": ratio(main),
    ...(phone && { "--ratio-phone": ratio(phone) }),
  } as CSSProperties;

  return (
    <picture>
      {source && (
        <source
          media={PHONE}
          srcSet={source.srcSet ?? source.src}
          sizes={source.sizes}
          width={source.width}
          height={source.height}
        />
      )}
      {/* getImageProps keeps both versions optimized, next/image can't
          render a <picture> */}
      <img
        {...img}
        alt={main.alt}
        style={{ ...img.style, ...ratios }}
        className={`art-image ${className}`}
      />
    </picture>
  );
}
