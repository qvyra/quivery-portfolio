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
  label,
  loop,
}: {
  src: string;
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
        // TODO: caption tracks. Media has no captions field yet, the upload
        // flow should add a .vtt per video and render it as a <track>
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={src}
          controls
          autoPlay
          playsInline
          loop={loop}
          aria-label={label}
          className="size-full object-contain"
        />
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
