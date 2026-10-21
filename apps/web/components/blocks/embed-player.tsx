"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PlayBadge } from "./play-button";

/**
 * Click-to-load facade for YouTube, Vimeo and Streamable. No third-party
 * script, cookie or iframe loads until the poster is clicked
 */
export function EmbedPlayer({
  src,
  thumbnail,
  title,
  provider,
}: {
  src: string;
  thumbnail: string | null;
  title: string;
  provider: string;
}) {
  const [active, setActive] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // keyboard users land in the player they just started
  useEffect(() => {
    if (active) frameRef.current?.focus();
  }, [active]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-ink-raised ring-1 ring-white/10">
      {active ? (
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 grid place-items-center"
        >
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="(min-width: 1024px) 60rem, 100vw"
              className="object-cover opacity-80 transition-opacity duration-(--motion-base) group-hover:opacity-100"
            />
          ) : (
            <span aria-hidden="true" className="absolute inset-0 bg-poster" />
          )}
          <PlayBadge />
          <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-4 pt-10 pb-3 text-left text-sm font-medium">
            <span className="sr-only">Play video: </span>
            {title}
            <span className="ml-2 text-white/60">· {provider}</span>
          </span>
        </button>
      )}
    </div>
  );
}
