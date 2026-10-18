import type { ComponentProps } from "react";

/**
 * Page-width wrapper capped at 80rem. The fluid side gutter also clears
 * notches on phones in landscape
 */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={["mx-auto w-full max-w-[80rem] px-gutter-safe", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
