import type { Media } from '@repo/shared';

// Blocks reference media as `{ mediaId }` at any depth (image block, gallery
// item...). These helpers walk that shape generically, so a new block type
// that holds media needs no changes here

export function collectMediaIds(value: unknown, ids = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectMediaIds(item, ids);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'mediaId' && typeof child === 'string') ids.add(child);
      else collectMediaIds(child, ids);
    }
  }
  return ids;
}

/** Copies `value`, adding `media` to every `{ mediaId }` (null if it's gone) */
export function attachMedia(
  value: unknown,
  media: Map<string, Media>,
): unknown {
  if (Array.isArray(value))
    return value.map((item) => attachMedia(item, media));
  if (value === null || typeof value !== 'object') return value;

  const entries = Object.entries(value).map(([key, child]) => [
    key,
    attachMedia(child, media),
  ]);
  const copy = Object.fromEntries(entries) as Record<string, unknown>;
  if (typeof copy.mediaId === 'string') {
    copy.media = media.get(copy.mediaId) ?? null;
  }
  return copy;
}
