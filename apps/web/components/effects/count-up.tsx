"use client";

import { useEffect, useRef, useState } from "react";
import { effectsConfig } from "@/lib/effects/config";
import { effectsTier } from "@/lib/effects/tier";

// "1,200+" → prefix "", number 1200, suffix "+", with its decimals and commas
const NUMBER = /^(\D*?)(\d[\d,]*(?:\.\d+)?)([^]*)$/;

function parse(value: string) {
  const match = NUMBER.exec(value);
  if (!match) return null;
  const [, prefix = "", digits = "", suffix = ""] = match;
  return {
    prefix,
    suffix,
    target: Number(digits.replace(/,/g, "")),
    decimals: digits.split(".")[1]?.length ?? 0,
    grouped: digits.includes(","),
  };
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * A stat's number counting up once it scrolls into view. The real value is
 * always in the DOM, so screen readers only ever get the final number: the
 * counting copy sits over it, hidden from them. Stats already on screen when
 * the page loads, and reduced motion, keep the plain value
 */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    const element = ref.current;
    const parts = parse(value);
    if (!element || !parts || effectsTier() === "off") return;
    // the server HTML shows the value, so one already on screen stays put
    // rather than flicking to 0
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    const format = (n: number) =>
      `${parts.prefix}${n.toLocaleString("en", {
        minimumFractionDigits: parts.decimals,
        maximumFractionDigits: parts.decimals,
        useGrouping: parts.grouped,
      })}${parts.suffix}`;
    let frame = 0;
    // off screen, so the swap to 0 is never seen
    const ready = requestAnimationFrame(() => setShown(format(0)));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = (now - start) / effectsConfig.countUp.duration;
          if (t >= 1) {
            setShown(null);
            return;
          }
          setShown(format(parts.target * easeOutExpo(t)));
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(element);
    return () => {
      cancelAnimationFrame(ready);
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [value]);

  return (
    <span ref={ref} className="relative inline-block">
      {/* holds the final width, so nothing beside it moves while counting */}
      <span className={shown === null ? undefined : "opacity-0"}>{value}</span>
      {shown !== null && (
        <span aria-hidden="true" className="absolute inset-y-0 left-0">
          {shown}
        </span>
      )}
    </span>
  );
}
