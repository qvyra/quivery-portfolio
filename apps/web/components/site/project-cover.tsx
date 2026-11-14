import type { Media } from "@repo/shared";
import { ArtPicture } from "@/components/blocks/art-picture";
import { MediaImage } from "@/components/blocks/media-image";

const sizes = "(min-width: 1280px) 76rem, 100vw";

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
    <div className="mt-12 overflow-hidden rounded-xl ring-1 ring-white/10">
      {phone ? (
        <ArtPicture
          main={cover}
          phone={phone}
          sizes={sizes}
          phoneSizes="100vw"
          priority
          className="h-auto w-full"
        />
      ) : (
        <MediaImage media={cover} sizes={sizes} priority />
      )}
    </div>
  );
}
