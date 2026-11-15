"use client";

import type { MediaKind } from "@repo/shared";
import {
  FileText,
  ImagePlus,
  LoaderCircle,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AdminError, adminFetch } from "./api";
import { FieldError } from "./form";

export type AdminMedia = {
  id: string;
  kind: MediaKind;
  url: string;
  storageKey: string | null;
  mimeType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  alt: string;
  captionsId: string | null;
  createdAt: string;
};

// one copy of the library per page, refreshed after uploads and edits
let library: Promise<AdminMedia[]> | null = null;
const listeners = new Set<() => void>();

export function useMediaLibrary() {
  const [items, setItems] = useState<AdminMedia[] | null>(null);
  const load = useCallback(() => {
    library ??= adminFetch<AdminMedia[]>("/media");
    library.then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(() => {
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);
  return items;
}

export function refreshMediaLibrary() {
  library = null;
  for (const listener of listeners) listener();
}

export function kindOf(type: string): MediaKind | null {
  if (type.startsWith("image/")) return "IMAGE";
  if (type.startsWith("video/")) return "VIDEO";
  if (type === "application/pdf" || type === "text/vtt") return "FILE";
  return null;
}

// browsers often report .vtt files with no type at all
function typeOf(file: File): string {
  if (file.type) return file.type;
  return file.name.toLowerCase().endsWith(".vtt") ? "text/vtt" : "";
}

async function dimensions(file: File, kind: MediaKind) {
  try {
    if (kind === "IMAGE") {
      const bitmap = await createImageBitmap(file);
      return { width: bitmap.width, height: bitmap.height };
    }
    if (kind === "VIDEO") {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });
      URL.revokeObjectURL(url);
      return { width: video.videoWidth, height: video.videoHeight };
    }
  } catch {
    // unknown dimensions are fine, they're only layout hints
  }
  return { width: null, height: null };
}

/**
 * Puts a file in the media store, straight from the browser, then records it.
 * The server checks the file with the store, so the type and size here are
 * only a first filter
 */
export async function uploadFile(file: File): Promise<AdminMedia> {
  const type = typeOf(file);
  const kind = kindOf(type);
  if (!kind) {
    throw new AdminError(
      "Upload images (PNG, JPEG, WebP, AVIF, GIF), MP4 or WebM videos, PDFs or .vtt captions.",
      400,
      "UPLOAD_TYPE",
    );
  }
  const { mode } = await adminFetch<{ mode: "blob" | "local" | "off" }>(
    "/uploads",
  );
  let url: string;
  if (mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const blob = await upload(`media/${kind.toLowerCase()}/${safeName}`, file, {
      access: "public",
      handleUploadUrl: "/admin/api/uploads",
      contentType: type,
    });
    url = blob.url;
  } else if (mode === "local") {
    // development only: multipart to this site, which writes public/uploads
    const form = new FormData();
    form.append(
      "file",
      type === file.type ? file : new File([file], file.name, { type }),
    );
    const response = await fetch("/admin/api/uploads/local", {
      method: "POST",
      body: form,
    });
    const json = (await response.json().catch(() => null)) as {
      data?: { url: string };
      message?: string;
    } | null;
    if (!response.ok || !json?.data) {
      throw new AdminError(
        json?.message ?? "Upload failed",
        response.status,
        "UPLOAD",
      );
    }
    url = json.data.url;
  } else {
    throw new AdminError(
      "Uploads are off: no media store is connected.",
      503,
      "UPLOADS_OFF",
    );
  }
  const media = await adminFetch<AdminMedia>("/media", {
    method: "POST",
    body: { kind, url, alt: "", ...(await dimensions(file, kind)) },
  });
  refreshMediaLibrary();
  return media;
}

export function MediaThumb({
  media,
  className = "size-16",
}: {
  media: AdminMedia;
  className?: string;
}) {
  if (media.kind === "IMAGE") {
    return (
      // admin thumbnails, from any origin and never on the public site
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={media.url}
        alt={media.alt}
        className={`${className} rounded-md object-cover ring-1 ring-white/10`}
      />
    );
  }
  if (media.kind === "VIDEO") {
    return (
      <video
        src={media.url}
        muted
        preload="metadata"
        className={`${className} rounded-md object-cover ring-1 ring-white/10`}
      />
    );
  }
  return (
    <span
      className={`${className} grid place-items-center rounded-md bg-white/[0.05] ring-1 ring-white/10`}
    >
      <FileText className="size-6 text-white/60" aria-hidden="true" />
    </span>
  );
}

export const fileName = (media: AdminMedia) =>
  decodeURIComponent(media.url.split("/").pop() ?? media.url);

/** Picks one file from the library, or uploads a new one */
export function MediaPicker({
  open,
  accept,
  onPick,
  onClose,
}: {
  open: boolean;
  accept: MediaKind;
  onPick: (media: AdminMedia) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  // a page can hold several pickers (the profile has two), so ids are per picker
  const titleId = useId();
  const items = useMediaLibrary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onPick(await uploadFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const matching = (items ?? []).filter((m) => m.kind === accept);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto w-[min(48rem,calc(100vw-2rem))] rounded-xl bg-ink-raised p-6 text-white ring-1 ring-white/15 backdrop:bg-black/70"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-h3 font-semibold">
          Choose {accept === "FILE" ? "a file" : `an ${accept.toLowerCase()}`}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-md hover:bg-white/[0.06]"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <label className="btn btn-primary btn-sm cursor-pointer">
        {busy ? (
          <LoaderCircle
            className="motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Upload aria-hidden="true" />
        )}
        {busy ? "Uploading" : "Upload new"}
        <input
          type="file"
          className="sr-only"
          disabled={busy}
          accept={
            accept === "IMAGE"
              ? "image/png,image/jpeg,image/webp,image/avif,image/gif"
              : accept === "VIDEO"
                ? "video/mp4,video/webm"
                : ".pdf,.vtt,application/pdf,text/vtt"
          }
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </label>
      <p
        role="alert"
        className={error ? "mt-3 text-sm text-(--color-error)" : undefined}
      >
        {error}
      </p>
      <ul className="mt-5 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
        {items === null && <li className="text-white/60">Loading…</li>}
        {items && matching.length === 0 && (
          <li className="col-span-full text-white/60">Nothing uploaded yet.</li>
        )}
        {matching.map((media) => (
          <li key={media.id}>
            <button
              type="button"
              onClick={() => onPick(media)}
              className="flex w-full flex-col items-start gap-2 rounded-lg p-2 text-left ring-1 ring-white/10 ring-inset hover:ring-white/30"
            >
              <MediaThumb
                media={media}
                className="aspect-video h-auto w-full"
              />
              <span className="w-full truncate text-xs text-white/70">
                {media.alt || fileName(media)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}

/** A form field holding one media id */
export function MediaField({
  id,
  label,
  help,
  error,
  accept,
  value,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  accept: MediaKind;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const items = useMediaLibrary();
  const [picking, setPicking] = useState(false);
  const selected = items?.find((m) => m.id === value) ?? null;
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-error`}
    >
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {selected ? (
          <MediaThumb media={selected} />
        ) : value ? (
          <span className="text-sm text-white/60">Loading…</span>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setPicking(true)}
        >
          <ImagePlus aria-hidden="true" /> {value ? "Change" : "Choose"}
        </button>
        {value && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onChange(null)}
          >
            <X aria-hidden="true" /> Remove
          </button>
        )}
      </div>
      {help && <p className="mt-1.5 text-sm text-white/55">{help}</p>}
      <FieldError id={`${id}-error`} error={error} />
      <MediaPicker
        open={picking}
        accept={accept}
        onClose={() => setPicking(false)}
        onPick={(media) => {
          onChange(media.id);
          setPicking(false);
        }}
      />
    </div>
  );
}

// one version as the site sizes it: its own shape, the shared alt text and
// caption under it
export function PreviewFrame({
  label,
  media,
  caption,
  className,
}: {
  label: string;
  media: AdminMedia;
  caption?: unknown;
  className: string;
}) {
  return (
    <figure className={className}>
      <figcaption className="mb-1.5 text-xs font-medium text-white/60">
        {label}
      </figcaption>
      {/* admin preview, from any origin and never on the public site */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt={media.alt}
        style={{
          aspectRatio:
            media.width && media.height
              ? `${media.width} / ${media.height}`
              : "16 / 9",
        }}
        className="h-auto w-full rounded-lg object-contain ring-1 ring-white/10"
      />
      {typeof caption === "string" && caption.trim() && (
        <p className="mt-1.5 text-xs text-white/60">{caption}</p>
      )}
    </figure>
  );
}

/**
 * A cover and its phone version side by side, as the project page shows
 * them. Nothing stops a landscape phone version, it's only flagged
 */
export function CoverPreview({
  main,
  phone,
}: {
  /** The two media ids */
  main: unknown;
  phone: unknown;
}) {
  const library = useMediaLibrary();
  const find = (id: unknown) =>
    (typeof id === "string" && library?.find((media) => media.id === id)) ||
    null;
  const cover = find(main);
  const mobile = find(phone);
  if (!cover && !mobile) return null;
  const landscape =
    mobile?.width && mobile.height && mobile.height <= mobile.width
      ? `${mobile.width} × ${mobile.height}`
      : null;

  return (
    <div className="space-y-3 rounded-lg bg-black/20 p-3 ring-1 ring-white/10 ring-inset">
      <div className="flex items-start gap-4">
        {cover ? (
          <PreviewFrame
            label="Wide screens and cards"
            media={cover}
            className="min-w-0 flex-1"
          />
        ) : (
          <p className="min-w-0 flex-1 text-sm text-white/60">
            No cover yet. The mobile cover only shows together with one.
          </p>
        )}
        {(mobile ?? cover) && (
          <PreviewFrame
            label={mobile ? "Phones, page top" : "Phones (same as the cover)"}
            media={(mobile ?? cover)!}
            className="w-[7.5rem] shrink-0 sm:w-[9rem]"
          />
        )}
      </div>
      {/* a warning, not an error: saving still works */}
      <p aria-live="polite">
        {landscape && (
          <span className="flex gap-2 text-sm text-white/80">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-focus"
            />
            <span>
              <span className="sr-only">Warning: </span>The mobile cover is{" "}
              {landscape}, so it isn&rsquo;t portrait. It still saves and shows
              on phones, but a taller image suits narrow screens.
            </span>
          </span>
        )}
      </p>
      {cover && (
        <p className="text-xs text-white/60">
          {cover.alt
            ? `Alt text, for both: ${cover.alt}`
            : "No alt text, so both are treated as decorative. Add it in Media."}
        </p>
      )}
    </div>
  );
}
