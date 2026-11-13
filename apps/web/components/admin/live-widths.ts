import type { AdminCollection } from "@repo/shared";
import type { Values } from "./form";
import { toTextWidth } from "./width-control";

/**
 * Shows unsaved text widths in the preview straight away. The preview renders
 * saved content, and widths are only data attributes on the page
 * (block-list.tsx), so they're set in the frame directly. Everything else
 * still updates on save
 */
export function applyTextWidths(
  frame: HTMLIFrameElement | null,
  collection: AdminCollection,
  /** The section's slug as last saved, which is what the preview shows */
  savedSlug: unknown,
  values: Values | null,
) {
  const doc = frame?.contentDocument;
  if (!doc || !values) return;
  // a section is one part of the homepage preview, a page or project is all
  // of its preview
  const root =
    collection === "sections"
      ? typeof savedSlug === "string"
        ? doc.getElementById(savedSlug)
        : null
      : doc.body;
  if (!root) return;

  const fallback = toTextWidth(values.textWidth) ?? "narrow";
  const own = new Map<string, unknown>();
  for (const value of Object.values(values)) {
    if (!Array.isArray(value)) continue;
    for (const block of value as Values[]) {
      if (block?.type === "richText" && typeof block.id === "string") {
        own.set(block.id, block.width);
      }
    }
  }

  for (const el of root.querySelectorAll<HTMLElement>("[data-text-width]")) {
    const block = el.dataset.blockId;
    // a block saved but since removed keeps its width until the next save
    if (block !== undefined && !own.has(block)) continue;
    el.dataset.textWidth =
      (block === undefined ? null : toTextWidth(own.get(block))) ?? fallback;
  }
  // the rail measures on resize, see page-toc.tsx
  frame?.contentWindow?.dispatchEvent(new Event("resize"));
}
