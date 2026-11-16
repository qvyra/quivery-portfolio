import type { Media } from "@repo/shared";
import Image from "next/image";
import { libraryIcon, type LibraryIcon } from "@/lib/icons/library";

const join = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ");

/**
 * A library icon as inline SVG in currentColor, so it's as white as the text
 * beside it (a nav link dims its icon until hovered). 24px unless the
 * className or the surrounding CSS sizes it
 */
export function IconSvg({
  icon,
  className,
}: {
  icon: LibraryIcon;
  className?: string;
}) {
  const stroke = icon.style === "stroke";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      width="24"
      height="24"
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : undefined}
      strokeWidth={stroke ? 2 : undefined}
      strokeLinecap={stroke ? "round" : undefined}
      strokeLinejoin={stroke ? "round" : undefined}
      aria-hidden="true"
      focusable="false"
      data-icon={icon.key}
      className={className}
      // library markup, from the repo, never from content
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

/**
 * The icon a piece of content picked: a library icon by key, or an uploaded
 * image, shown as uploaded. With neither it falls back to `fallback` (a
 * type's own icon, say). A key this site doesn't know shows nothing. Always
 * decorative: the text beside it names the thing
 */
export function SiteIcon({
  iconKey,
  media,
  fallback,
  className,
  sizes = "24px",
}: {
  iconKey?: string | null;
  media?: Media | null;
  fallback?: string | null;
  className?: string;
  /** The `sizes` hint for an uploaded image */
  sizes?: string;
}) {
  if (media && media.kind === "IMAGE") {
    return (
      <span className={join("site-icon-image", className)} aria-hidden="true">
        <Image
          src={media.url}
          alt=""
          width={media.width ?? 96}
          height={media.height ?? 96}
          sizes={sizes}
          unoptimized={media.mimeType === "image/svg+xml"}
        />
      </span>
    );
  }
  const icon = libraryIcon(iconKey ?? (media ? null : fallback));
  return icon ? <IconSvg icon={icon} className={className} /> : null;
}

/** Whether SiteIcon would draw something, so an empty frame isn't drawn */
export function hasSiteIcon(
  iconKey: string | null | undefined,
  media: Media | null | undefined,
): boolean {
  return media?.kind === "IMAGE" || libraryIcon(iconKey) !== null;
}
