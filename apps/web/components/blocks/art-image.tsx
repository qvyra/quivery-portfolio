import type { Media } from "@repo/shared";
import { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import { ImageZoom } from "./image-zoom";

// in px, like the phone rule for .art-image in globals.css, so a larger
// default font size can't pull the two apart
const PHONE = "(max-width: 639px)";

// a file with no recorded size is letterboxed into 16:9
const shape = (media: Media) =>
  media.width && media.height
    ? { width: media.width, height: media.height }
    : { width: 1600, height: 900 };

function ArtPicture({
  main,
  phone,
  sizes,
  phoneSizes,
  lazy,
  className,
}: {
  main: Media;
  phone: Media | null;
  sizes: string;
  phoneSizes: string;
  lazy: boolean;
  className: string;
}) {
  const optimized = (media: Media, sizes: string) =>
    getImageProps({
      src: media.url,
      // the phone version shares it, a <source> has no alt of its own
      alt: main.alt,
      sizes,
      ...shape(media),
      ...(lazy ? { loading: "lazy" } : {}),
      // the optimizer only handles raster images, SVGs are served as-is
      unoptimized: media.mimeType === "image/svg+xml",
    }).props;
  const img = optimized(main, sizes);
  const source = phone && optimized(phone, phoneSizes);
  const ratio = (media: Media) => shape(media).width / shape(media).height;
  // each version's own shape, picked by .art-image, so swapping between
  // them can't shift the layout
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

/**
 * An image block's picture: the phone version below 640px when there is one,
 * and a tap opens the version on screen full size. A deleted or non-image
 * file renders nothing
 */
export function ArtImage({
  image,
  mobileImage,
  sizes,
  caption,
}: {
  image: Media | null;
  mobileImage?: Media | null | undefined;
  /** The `sizes` hint for the main image, the phone one fills the screen */
  sizes: string;
  caption?: string | undefined;
}) {
  if (image?.kind !== "IMAGE") return null;
  const phone = mobileImage?.kind === "IMAGE" ? mobileImage : null;
  return (
    <ImageZoom
      label={image.alt ? `Enlarge image: ${image.alt}` : "Enlarge image"}
      title={image.alt || caption || "Image"}
      caption={caption}
      full={
        <ArtPicture
          main={image}
          phone={phone}
          sizes="100vw"
          phoneSizes="100vw"
          lazy={false}
          className="lightbox-image"
        />
      }
    >
      <ArtPicture
        main={image}
        phone={phone}
        sizes={sizes}
        phoneSizes="100vw"
        lazy
        className="h-auto w-full rounded-xl ring-1 ring-white/10"
      />
    </ImageZoom>
  );
}
