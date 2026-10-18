import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonStyle = { variant?: ButtonVariant; size?: ButtonSize };

/** Class names for the `.btn` styles in globals.css */
export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyle & { className?: string | undefined }) {
  return ["btn", `btn-${variant}`, `btn-${size}`, className]
    .filter(Boolean)
    .join(" ");
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyle;

/**
 * Link styled as a button. A trailing icon marked `data-icon="end"` nudges
 * forward on hover
 */
export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props} />
  );
}

type ButtonProps = ComponentProps<"button"> & ButtonStyle;

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}
