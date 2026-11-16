// A project's cover as its link preview: cropped from the centre to the share
// size and saved as JPEG. LinkedIn and others don't take WebP, which is what
// covers are usually uploaded as
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { env } from "@/lib/env";
import { ogSize } from "./size";

// LinkedIn refuses images over 5 MB and recommends far less. Quality steps
// down until the file fits, which a busy 1200 x 630 photo might need
const MAX_BYTES = 1_000_000;
const QUALITIES = [85, 78, 70, 60];

// the site's background, behind any transparent parts, since JPEG has no alpha
const BACKGROUND = "#0a001d";

async function coverBytes(url: string): Promise<Buffer> {
  if (url.startsWith("/")) {
    // a root-relative file is in public/ and the build has no server to ask.
    // Ignored by tracing, or every file in public/ would ship with the image
    // functions: after the build the CDN serves it
    const path = join(process.cwd(), "public", decodeURIComponent(url));
    const local = await readFile(/* turbopackIgnore: true */ path).catch(
      () => null,
    );
    if (local) return local;
    return coverBytes(`${env().siteUrl}${url}`);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(
      `[og] Couldn't fetch the cover ${url} (${response.status})`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

/** The cover as JPEG bytes at the share size, under MAX_BYTES */
export async function renderCover(
  url: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const resized = sharp(await coverBytes(url))
    .resize(ogSize.width, ogSize.height, { fit: "cover", position: "centre" })
    .flatten({ background: BACKGROUND });
  let jpeg: Buffer | undefined;
  for (const quality of QUALITIES) {
    jpeg = await resized
      .clone()
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer();
    if (jpeg.length <= MAX_BYTES) break;
  }
  return new Uint8Array(jpeg!);
}
