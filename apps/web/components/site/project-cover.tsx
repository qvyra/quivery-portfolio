import type { Media } from "@repo/shared";
import { ArtPicture } from "@/components/blocks/art-picture";
import { MediaImage } from "@/components/blocks/media-image";
import { PAGE_SIZES, PHONE_SIZES } from "@/lib/image-sizes";

/**
 * The image at the top of a project page, its main (LCP) image. A portrait
 * mobile cover replaces the cover on phones, and only this header uses it.
 * Without one it's the plain cover image, as before mobile covers existed
 */
export function ProjectCover({
  cover,
  mobileCover,
}: {
  cover: Media | null;
  mobileCover: Media | null;
}) {
  // the mobile cover is a version of the cover, not an image of its own
  if (cover?.kind !== "IMAGE") return null;
  const phone = mobileCover?.kind === "IMAGE" ? mobileCover : null;
  return (
    <div className="image-frame mt-12 overflow-hidden">
      {phone ? (
        <ArtPicture
          main={cover}
          phone={phone}
          sizes={PAGE_SIZES}
          phoneSizes={PHONE_SIZES}
          priority
          className="h-auto w-full"
        />
      ) : (
        <MediaImage media={cover} sizes={PAGE_SIZES} priority />
      )}
    </div>
  );
}
