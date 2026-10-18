"use client";

import Image from "next/image";
import { heroArt } from "@/lib/brand";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from "react";

const SIZES = "(min-width: 1024px) 34rem, 80vw";
// the image optimizer only re-encodes rasters, SVG artwork is served as-is
const unoptimizedStill = heroArt.still.src.endsWith(".svg");

// rounded square in a 100×100 box. The mark is always square, so it scales
// evenly and stays sharp, and the glow and sweep reuse it to line up exactly
const FRAME_PATH =
  "M8.5 1.5H91.5A7 7 0 0 1 98.5 8.5V91.5A7 7 0 0 1 91.5 98.5H8.5A7 7 0 0 1 1.5 91.5V8.5A7 7 0 0 1 8.5 1.5Z";

const OUTLINE_WIDTH = 1.1;

// the light is a rotating conic gradient (compositor-only), masked to a
// slightly wider stroke of the same path so it spills just past the white line
const SWEEP_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${FRAME_PATH}" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>`,
)}")`;

function usePageVisible() {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener("visibilitychange", onChange);
      return () => document.removeEventListener("visibilitychange", onChange);
    },
    () => document.visibilityState === "visible",
    () => false,
  );
}

function useInView(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const io = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? false),
    );
    io.observe(element);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

function usePageLoaded() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const done = () => setLoaded(true);
    if (document.readyState === "complete") {
      const timer = window.setTimeout(done, 0);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener("load", done, { once: true });
    return () => window.removeEventListener("load", done);
  }, []);
  return loaded;
}

// fades in over the still once it has loaded
function AnimatedLogo({ src }: { src: string }) {
  const [ready, setReady] = useState(false);
  return (
    <Image
      src={src}
      alt=""
      fill
      unoptimized
      sizes={SIZES}
      onLoad={() => setReady(true)}
      className={`object-contain transition-opacity duration-500 ease-out-quart ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/**
 * The highlighted Q: the logo in a glowing vector frame, with a slow light
 * travelling around the outline
 */
export function HeroMark({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const pageVisible = usePageVisible();
  const reducedMotion = usePrefersReducedMotion();
  const pageLoaded = usePageLoaded();
  // the light and animated logo only run while the mark is on screen and the
  // tab is visible. Reduced motion gets a static frame and the still logo
  const active = inView && pageVisible && !reducedMotion;

  return (
    <div
      ref={ref}
      data-active={active}
      className={["hero-mark", className].filter(Boolean).join(" ")}
      style={{ "--hero-mark-mask": SWEEP_MASK } as CSSProperties}
    >
      <svg className="hero-mark-glow" viewBox="0 0 100 100" aria-hidden="true">
        <path
          d={FRAME_PATH}
          fill="none"
          stroke="#ffd9f4"
          strokeWidth={OUTLINE_WIDTH * 2.5}
          strokeLinejoin="round"
        />
      </svg>

      {/* same URL and size as the still below, so it's one request */}
      <div className="hero-mark-halo">
        <Image
          src={heroArt.still.src}
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          unoptimized={unoptimizedStill}
          sizes={SIZES}
          className="object-contain"
        />
      </div>

      <div className="hero-mark-art">
        <Image
          src={heroArt.still.src}
          alt="Quivery logo"
          fill
          loading="eager"
          fetchPriority="high"
          unoptimized={unoptimizedStill}
          sizes={SIZES}
          className="object-contain"
        />
        {heroArt.animated && active && pageLoaded && (
          <AnimatedLogo src={heroArt.animated} />
        )}
      </div>

      <svg
        className="hero-mark-outline"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path
          d={FRAME_PATH}
          fill="none"
          stroke="white"
          strokeWidth={OUTLINE_WIDTH}
          strokeLinejoin="round"
        />
      </svg>

      <div className="hero-mark-sweep" aria-hidden="true">
        <div className="hero-mark-beam" />
      </div>
    </div>
  );
}
