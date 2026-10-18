"use client";

import {
  useEffect,
  useRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";

// one observer shared by every <Reveal> on the page
let observer: IntersectionObserver | undefined;

function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.reveal = "in";
        observer?.unobserve(entry.target);
      }
    },
    // fire a little after the top edge enters the viewport
    { rootMargin: "0px 0px -8% 0px" },
  );
  return observer;
}

/**
 * Fades content up as it scrolls into view (styles in globals.css). With
 * `stagger` the direct children reveal one after another
 */
export function Reveal({
  as: Tag = "div",
  stagger = false,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "ul" | "ol" | "dl";
  stagger?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // the server HTML is fully visible. Only what's below the fold at
    // hydration gets hidden, so nothing on screen flickers and it all stays
    // visible if JavaScript fails
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.dataset.reveal = "out";
    const io = getObserver();
    io.observe(element);
    return () => io.unobserve(element);
  }, []);

  const Element = Tag as ElementType;
  return (
    <Element ref={ref} data-reveal-group={stagger ? "" : undefined} {...props}>
      {children}
    </Element>
  );
}
