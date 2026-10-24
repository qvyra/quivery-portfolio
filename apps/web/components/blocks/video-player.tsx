"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { PlayBadge } from "./play-button";

// silent loop, like a GIF, that only plays while on screen
function LoopVideo({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    });
    io.observe(video);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
      className="size-full object-cover"
    />
  );
}

/**
 * Uploaded video behind a play button, so nothing downloads until it's played.
 * Looping clips play silently while visible, unless reduced motion is on
 */
export function VideoPlayer({
  src,
  captionsUrl,
  label,
  loop,
}: {
  src: string;
  /** WebVTT captions, shown on by default when there are any */
  captionsUrl: string | null;
  /** Accessible name: the caption, or a generic description */
  label: string;
  loop: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-ink-raised ring-1 ring-white/10">
      {loop && !reducedMotion ? (
        <LoopVideo src={src} label={label} />
      ) : playing ? (
        // a video without captions uploaded yet still plays
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={src}
          controls
          autoPlay
          playsInline
          loop={loop}
          aria-label={label}
          // captions from object storage are cross-origin, and a <track> from
          // another origin only loads in CORS mode
          crossOrigin={
            captionsUrl?.startsWith("http") ? "anonymous" : undefined
          }
          className="size-full object-contain"
        >
          {captionsUrl && (
            <track
              kind="captions"
              src={captionsUrl}
              srcLang="en"
              label="English"
              default
            />
          )}
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 grid place-items-center bg-poster"
        >
          <PlayBadge />
          <span className="sr-only">Play video: {label}</span>
        </button>
      )}
    </div>
  );
}
