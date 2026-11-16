import type { Media } from '@repo/shared';

// Blocks reference media as `{ mediaId }` at any depth (image block, gallery
// item...), and an uploaded icon as `{ kind: "media", id }` (a link's icon).
// These helpers walk both shapes generically, so a new block type that holds
// media needs no changes here

const isIconUpload = (value: Record<string, unknown>) =>
  value.kind === 'media' && typeof value.id === 'string';

export function collectMediaIds(value: unknown, ids = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectMediaIds(item, ids);
  } else if (value !== null && typeof value === 'object') {
    if (isIconUpload(value as Record<string, unknown>)) {
      ids.add((value as { id: string }).id);
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'mediaId' && typeof child === 'string') ids.add(child);
      else collectMediaIds(child, ids);
    }
  }
  return ids;
}

/**
 * Copies `value`, adding `media` to every `{ mediaId }` and uploaded icon
 * (null if it's gone)
 */
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
  } else if (isIconUpload(copy)) {
    copy.media = media.get(copy.id as string) ?? null;
  }
  return copy;
}
