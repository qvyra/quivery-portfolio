// Fits a single-colour logo into a square viewBox at the library's optical
// size, for a new entry in lib/icons/library.ts:
//   node scripts/icon-box.mjs path/to/logo.svg
// It prints the viewBox and the inner markup to paste into the entry.
// A wide logo spans the box, a square one sits smaller in it, so the two look
// the same size side by side: a filled square reads heavier than a thin bar
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import process from "node:process";
import sharp from "sharp";

// how much of the box the ink may take: its longest side, and the side of a
// square with the same area
const LONG_SIDE = 0.92;
const AREA_SIDE = 0.8;

/** The ink's bounds in viewBox units, from a high resolution render */
export async function inkBox(svg) {
  const [vx, vy, vw, vh] = svg
    .match(/viewBox="([^"]+)"/)[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const scale = 2048 / Math.max(vw, vh);
  const sized = svg
    .replace(/\s(width|height)="[^"]*"/g, "")
    .replace(
      "<svg",
      `<svg width="${Math.round(vw * scale)}" height="${Math.round(vh * scale)}"`,
    )
    .replaceAll("currentColor", "#000");
  const { info } = await sharp(Buffer.from(sized))
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .toBuffer({ resolveWithObject: true });
  return {
    x: vx + -(info.trimOffsetLeft ?? 0) / scale,
    y: vy + -(info.trimOffsetTop ?? 0) / scale,
    w: info.width / scale,
    h: info.height / scale,
  };
}

/** A square viewBox around the ink at the library's optical size */
export function squareViewBox({ x, y, w, h }) {
  const side = Math.max(
    Math.max(w, h) / LONG_SIDE,
    Math.sqrt(w * h) / AREA_SIDE,
  );
  const round = (n) => Math.round(n * 1000) / 1000;
  return [x + w / 2 - side / 2, y + h / 2 - side / 2, side, side]
    .map(round)
    .join(" ");
}

/** The markup inside the <svg>, without its wrapper */
export function innerMarkup(svg) {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .trim();
}

if (process.argv[1]?.endsWith("icon-box.mjs") && process.argv[2]) {
  const svg = await readFile(process.argv[2], "utf8");
  console.log(`viewBox: "${squareViewBox(await inkBox(svg))}",`);
  console.log(`body: ${JSON.stringify(innerMarkup(svg))},`);
}
