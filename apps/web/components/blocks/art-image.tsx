import type { Media } from "@repo/shared";
import { PHONE_SIZES } from "@/lib/image-sizes";
import { ArtPicture } from "./art-picture";
import { ImageZoom } from "./image-zoom";

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
  /** The `sizes` hint for the main image, the phone one is the content width */
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
          className="lightbox-image"
        />
      }
    >
      <ArtPicture
        main={image}
        phone={phone}
        sizes={sizes}
        phoneSizes={PHONE_SIZES}
        className="h-auto w-full rounded-xl"
      />
    </ImageZoom>
  );
}
