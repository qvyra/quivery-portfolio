// Where admin uploads live. Files go straight from the browser to the store,
// so they never pass through this site or the API. This only checks what
// arrived and removes files, behind one interface so the store can change
import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, head } from "@vercel/blob";
import type { MediaKind } from "@repo/shared";
import { env } from "@/lib/env";

/** What the store says about a file, never what the browser claimed */
export type StoredFile = {
  url: string;
  key: string;
  contentType: string;
  size: number;
};

export type MediaStorage = {
  readonly mode: "blob" | "local";
  /** The file at `url` as the store sees it, or null if it isn't there */
  describe(url: string): Promise<StoredFile | null>;
  remove(file: { url: string; storageKey: string | null }): Promise<void>;
};

// what each kind may be, and how big. No SVG: it can carry scripts. The free
// Blob store holds 1 GB in all, which caps videos in practice
export const uploadRules: Record<
  MediaKind,
  { types: string[]; maxBytes: number }
> = {
  IMAGE: {
    types: ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"],
    maxBytes: 10 * 1024 * 1024,
  },
  VIDEO: { types: ["video/mp4", "video/webm"], maxBytes: 100 * 1024 * 1024 },
  // the CV, and WebVTT captions for videos
  FILE: { types: ["application/pdf", "text/vtt"], maxBytes: 10 * 1024 * 1024 },
};

export const allTypes = Object.values(uploadRules).flatMap((r) => r.types);
export const largestUpload = Math.max(
  ...Object.values(uploadRules).map((r) => r.maxBytes),
);

/** Vercel Blob, a public store served from its own CDN */
function blobStorage(token: string): MediaStorage {
  return {
    mode: "blob",
    async describe(url) {
      if (!new URL(url).hostname.endsWith(".public.blob.vercel-storage.com")) {
        return null;
      }
      try {
        const blob = await head(url, { token });
        return {
          url: blob.url,
          key: blob.pathname,
          contentType: blob.contentType,
          size: blob.size,
        };
      } catch {
        return null;
      }
    },
    async remove({ url }) {
      await del(url, { token });
    },
  };
}

// development only: files in public/uploads, served by next dev. Git ignores
// the folder
const localDir = path.join(process.cwd(), "public", "uploads");
const localTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".vtt": "text/vtt",
};

function localFile(url: string): string | null {
  const name = url.startsWith("/uploads/") ? url.slice("/uploads/".length) : "";
  // one plain file name, nothing that could climb out of the folder
  return /^[\w.-]+$/.test(name) && !name.startsWith(".")
    ? path.join(localDir, name)
    : null;
}

const localStorage: MediaStorage = {
  mode: "local",
  async describe(url) {
    const file = localFile(url);
    if (!file) return null;
    try {
      const info = await stat(file);
      return {
        url,
        key: `uploads/${path.basename(file)}`,
        contentType:
          localTypes[path.extname(file).toLowerCase()] ??
          "application/octet-stream",
        size: info.size,
      };
    } catch {
      return null;
    }
  },
  async remove({ url }) {
    const file = localFile(url);
    if (file) await unlink(file).catch(() => {});
  },
};

/** Saves an upload in development, where there's no Blob store */
export async function saveLocalUpload(file: File): Promise<string> {
  const extension = Object.entries(localTypes).find(
    ([, type]) => type === file.type,
  )?.[0];
  if (!extension) throw new Error(`Unsupported type ${file.type}`);
  const base = file.name
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const name = `${base || "file"}-${randomBytes(4).toString("hex")}${extension}`;
  await mkdir(localDir, { recursive: true });
  await writeFile(
    path.join(localDir, name),
    Buffer.from(await file.arrayBuffer()),
  );
  return `/uploads/${name}`;
}

/**
 * Blob when a store is connected, local files while developing, and nothing
 * in production without a store, so uploads never land on a server's disk
 */
export function mediaStorage(): MediaStorage | null {
  const { blobToken } = env();
  if (blobToken) return blobStorage(blobToken);
  return process.env.NODE_ENV === "production" ? null : localStorage;
}
