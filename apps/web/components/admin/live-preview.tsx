"use client";

import { Maximize2, Monitor, Smartphone, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";

type Mode = "desktop" | "mobile";
type Size = { width: number; height: number };

const presets: Record<Mode, Size[]> = {
  desktop: [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ],
  mobile: [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ],
};

const key = (size: Size) => `${size.width}x${size.height}`;
const sizeOf = (screen: Screen) =>
  presets[screen.mode].find((size) => key(size) === screen.size[screen.mode]) ??
  presets[screen.mode][1]!;

/** The mode on screen and the size last picked for each mode */
type Screen = { mode: Mode; size: Record<Mode, string> };

const initial: Screen = {
  mode: "desktop",
  size: { desktop: "1440x900", mobile: "390x844" },
};
const STORE = "admin-preview-screen";

function saved(): Screen {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem(STORE) ?? "null",
    ) as Partial<Screen> | null;
    if (stored?.mode === "desktop" || stored?.mode === "mobile") {
      return { mode: stored.mode, size: { ...initial.size, ...stored.size } };
    }
  } catch {
    // the defaults stay
  }
  return initial;
}

/**
 * The preview's screen, kept for the session so every editor opens on the
 * one last used. Storage can be missing (private windows), then it's the
 * defaults each time. Read on first render: the picker only shows once the
 * preview is opened, so the server's defaults never hydrate against it
 */
export function usePreviewScreen() {
  const [screen, setScreen] = useState(() =>
    typeof window === "undefined" ? initial : saved(),
  );
  const update = useCallback((next: Screen) => {
    setScreen(next);
    try {
      sessionStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      // only this page remembers it then
    }
  }, []);
  return [screen, update] as const;
}

/** Desktop or mobile, and the screen size for it */
export function ScreenPicker({
  screen,
  onChange,
}: {
  screen: Screen;
  onChange: (screen: Screen) => void;
}) {
  const id = useId();
  const modes = [
    { mode: "desktop", label: "Desktop", Icon: Monitor },
    { mode: "mobile", label: "Mobile", Icon: Smartphone },
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Preview screen"
        className="inline-flex gap-1 rounded-lg p-1 ring-1 ring-white/15 ring-inset"
      >
        {modes.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={screen.mode === mode}
            onClick={() => onChange({ ...screen, mode })}
            className={[
              "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
              screen.mode === mode
                ? "bg-white/[0.14] text-white"
                : "text-white/70 hover:bg-white/[0.06] hover:text-white",
            ].join(" ")}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <label htmlFor={`${id}-size`} className="sr-only">
        Screen size
      </label>
      <select
        id={`${id}-size`}
        className="field-input min-h-11 w-auto py-1.5"
        value={key(sizeOf(screen))}
        onChange={(e) =>
          onChange({
            ...screen,
            size: { ...screen.size, [screen.mode]: e.target.value },
          })
        }
      >
        {presets[screen.mode].map((size) => (
          <option key={key(size)} value={key(size)}>
            {size.width} × {size.height}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * The page at the screen's real width and height, scaled down to fit its
 * box. The frame is that size, so the page's own breakpoints, mobile cover
 * and menus switch as they would on the device
 */
export function ScaledFrame({
  src,
  screen,
  frameRef,
  onLoad,
}: {
  src: string;
  screen: Screen;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onLoad: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { width, height } = sizeOf(screen);
  const [scale, setScale] = useState(0);
  const mobile = screen.mode === "mobile";

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () =>
      setScale(Math.min(1, box.clientWidth / width, box.clientHeight / height));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [width, height]);

  // phones draw their scrollbar over the page, a desktop one would take
  // 15px from a 390px screen
  const fitScrollbar = useCallback(() => {
    frameRef.current?.contentDocument?.documentElement.style.setProperty(
      "scrollbar-width",
      mobile ? "none" : null,
    );
  }, [frameRef, mobile]);
  useEffect(fitScrollbar, [fitScrollbar]);

  return (
    // the space around the page is backdrop in the full-screen view
    <div
      ref={boxRef}
      data-backdrop=""
      className="grid h-full min-h-0 w-full items-start justify-items-center overflow-hidden"
    >
      <div
        className="relative overflow-hidden rounded-lg bg-ink ring-1 ring-white/15"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          ref={frameRef}
          src={src}
          title={`Preview at ${width} × ${height}`}
          onLoad={() => {
            fitScrollbar();
            onLoad();
          }}
          className="absolute top-0 left-0"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
          }}
        />
      </div>
    </div>
  );
}

/**
 * The preview over the whole screen, with the same screen picker. Escape,
 * the close button or a click on the dimmed backdrop closes it, and focus
 * goes back to the button that opened it
 */
export function PreviewLightbox({
  src,
  screen,
  onScreen,
  frameRef,
  onLoad,
  opener,
  onClose,
}: {
  src: string;
  screen: Screen;
  onScreen: (screen: Screen) => void;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onLoad: () => void;
  opener: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
      if (dialog.open) dialog.close();
    };
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    // Escape closes it natively. The click handler is for the dimmed space
    // around the preview, which acts as the backdrop
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-label="Preview, full screen"
      className="preview-lightbox"
      onClose={() => {
        onClose();
        opener.current?.focus();
      }}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target === event.currentTarget || "backdrop" in target.dataset)
          close();
      }}
    >
      <div
        data-backdrop=""
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <ScreenPicker screen={screen} onChange={onScreen} />
        <button
          ref={closeRef}
          type="button"
          aria-label="Close the full-screen preview"
          onClick={close}
          className="lightbox-close static"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ScaledFrame
          src={src}
          screen={screen}
          frameRef={frameRef}
          onLoad={onLoad}
        />
      </div>
    </dialog>
  );
}

export function FullScreenButton({
  buttonRef,
  onClick,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className="btn btn-secondary btn-sm shrink-0"
    >
      <Maximize2 aria-hidden="true" />
      Full screen
    </button>
  );
}
