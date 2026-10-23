// Renders every site icon from the vectors in icons/: npm run icons --workspace web.
// Each size is drawn from the vector, not scaled down from a big PNG, so the
// small ones stay as sharp as they can be
import { Buffer } from "node:buffer";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const BACKGROUND = "#0A001D";

// How far the Q sits below centre, as a share of its height. The tail hangs
// below the bowl, so a centred box leaves the bowl looking high. This moves it
// part of the way, centring the bowl itself looks too low
const DROP = 0.035;

function load(name) {
  const svg = readFileSync(
    new URL(`../icons/${name}`, import.meta.url),
    "utf8",
  );
  const [x, y, width, height] = svg
    .match(/viewBox="([^"]+)"/)[1]
    .split(/\s+/)
    .map(Number);
  return { x, y, width, height, shape: svg.match(/<path[\s\S]*?\/>/)[0] };
}

// q-small.svg drops the shaft inside the bowl, which turns to mush at 16px
const full = load("q.svg");
const small = load("q-small.svg");

/**
 * The Q on a square canvas, centred and then dropped by DROP. `height` is the
 * Q's share of the canvas height (it's taller than it's wide), `background`
 * fills the square
 */
function compose({ q = full, size, height, background }) {
  const scale = (size * height) / q.height;
  const x = (size - q.width * scale) / 2 - q.x * scale;
  const y = (size - q.height * scale) / 2 - q.y * scale + DROP * size * height;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    background
      ? `<rect width="${size}" height="${size}" fill="${background}"/>`
      : "",
    `<g transform="translate(${x} ${y}) scale(${scale})">${q.shape}</g>`,
    "</svg>",
  ].join("");
}

const png = (svg) => new Resvg(svg).render().asPng();

// .ico holding PNG images, which every current browser reads
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

const out = (path, data) => {
  const file = new URL(`../${path}`, import.meta.url);
  mkdirSync(new URL(".", file), { recursive: true });
  writeFileSync(file, data);
  console.log(`[icons] ${path}`);
};

// Tab icons on transparent, as large as the square allows. The Q gives up the
// drop at both ends so the tail stays inside after it moves down. The .ico is
// the only tab icon: Chrome picks a separate PNG or SVG over it at every
// density, and then the tuned 16px frame is never shown
const tab = (size, q = full) => png(compose({ q, size, height: 1 - 2 * DROP }));
out(
  "app/favicon.ico",
  ico([
    { size: 16, data: tab(16, small) },
    { size: 32, data: tab(32) },
    { size: 48, data: tab(48) },
  ]),
);

// iOS draws no transparency and rounds the corners itself
out(
  "app/apple-icon.png",
  png(compose({ size: 180, height: 0.72, background: BACKGROUND })),
);

// Android and installed app icons (see app/manifest.ts). The maskable one keeps
// the Q inside the central safe circle, 80% of the width, that any mask shape keeps
out("public/icons/icon-192.png", png(compose({ size: 192, height: 0.9 })));
out("public/icons/icon-512.png", png(compose({ size: 512, height: 0.9 })));
out(
  "public/icons/icon-maskable-512.png",
  png(compose({ size: 512, height: 0.6, background: BACKGROUND })),
);
