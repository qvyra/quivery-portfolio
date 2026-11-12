"use client";

import { Expand, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps an image in a button that opens `full` in a modal dialog. The dialog
 * keeps focus inside, Escape or a click beside the image closes it, and focus
 * goes back to the image. `full` only mounts while open, so it costs nothing
 * until then
 */
export function ImageZoom({
  label,
  title,
  caption,
  full,
  children,
}: {
  /** The button's name */
  label: string;
  /** The dialog's name */
  title: string;
  caption?: string | undefined;
  full: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    // <html> reserves the scrollbar gutter, so locking doesn't shift layout
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
      if (dialog.open) dialog.close();
    };
  }, [open]);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-label={label}
        onClick={() => setOpen(true)}
        className="image-zoom"
      >
        {children}
        <span className="image-zoom-badge" aria-hidden="true">
          <Expand className="size-4" />
        </span>
      </button>
      {/* Escape closes it natively. The click handler is for the area
          beside the image, which acts as the backdrop */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        aria-label={title}
        className="lightbox"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (!(event.target instanceof HTMLImageElement)) close();
        }}
      >
        {open && (
          <>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close"
              onClick={close}
              className="lightbox-close"
            >
              <X aria-hidden="true" />
            </button>
            <figure className="lightbox-figure">
              {full}
              {caption && (
                <figcaption className="text-sm text-white/70">
                  {caption}
                </figcaption>
              )}
            </figure>
          </>
        )}
      </dialog>
    </>
  );
}
