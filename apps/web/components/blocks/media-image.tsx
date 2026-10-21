import type { Media } from "@repo/shared";
import Image from "next/image";

/** A Media row as an image. A deleted file (media: null) renders nothing */
export function MediaImage({
  media,
  sizes,
  priority = false,
  className,
}: {
  media: Media | null;
  /** The `sizes` hint for responsive srcset selection */
  sizes: string;
  /** Only for the page's main (LCP) image */
  priority?: boolean;
  className?: string;
}) {
  if (!media || media.kind !== "IMAGE") return null;
  const loading = priority
    ? ({ loading: "eager", fetchPriority: "high" } as const)
    : ({ loading: "lazy" } as const);
  const common = {
    // root-relative (public/) or absolute (object storage, allowed by
    // MEDIA_ORIGIN in next.config.ts), so moving uploads only changes the URLs
    src: media.url,
    alt: media.alt,
    sizes,
    // the optimizer only handles raster images, SVGs are served as-is
    unoptimized: media.mimeType === "image/svg+xml",
    ...loading,
  };

  if (media.width && media.height) {
    return (
      <Image
        {...common}
        width={media.width}
        height={media.height}
        className={["h-auto w-full", className].filter(Boolean).join(" ")}
      />
    );
  }
  // dimensions unknown, so a 16:9 box keeps the layout from shifting
  return (
    <div className="relative aspect-video w-full">
      <Image
        {...common}
        fill
        className={["object-contain", className].filter(Boolean).join(" ")}
      />
    </div>
  );
}
