// The current CV at a URL that never changes, so links already sent keep
// working when the file is replaced. It opens in the browser, and
// ?download saves it under the download file name set in the admin
import { createHash } from "node:crypto";
import { connection } from "next/server";
import { contentDisposition } from "@/lib/cv";
import { getCv } from "@/lib/content";

// it carries contact details, so search engines may fetch it but not list it
const NOINDEX = { "X-Robots-Tag": "noindex, nofollow, noarchive" };

function notFound(): Response {
  return new Response("No CV right now.", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...NOINDEX,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  // per request: the build would otherwise prerender it once, and the
  // download and If-None-Match answers depend on the request
  await connection();
  const cv = await getCv();
  if (!cv) return notFound();

  const download = new URL(request.url).searchParams.has("download");
  // changes with the file, its name and how it opens
  const etag = `"${createHash("sha256")
    .update(`${cv.id}\n${cv.fileName}\n${download}`)
    .digest("base64url")
    .slice(0, 22)}"`;
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": contentDisposition(
      download ? "attachment" : "inline",
      cv.fileName,
    ),
    // browsers ask again each time and get a 304 while it's the same file,
    // and no shared cache keeps it past a replacement
    "Cache-Control": "private, no-cache",
    ETag: etag,
    ...NOINDEX,
  };
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  // relative in development, where uploads are files this site serves
  const file = await fetch(new URL(cv.url, request.url), {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!file?.ok || !file.body) {
    console.error(`[cv] Couldn't fetch the CV (${file?.status ?? "error"})`);
    return new Response("The CV is unavailable right now.", {
      status: 502,
      headers: { "Cache-Control": "no-store", ...NOINDEX },
    });
  }
  const length = file.headers.get("content-length");
  return new Response(file.body, {
    headers: { ...headers, ...(length && { "Content-Length": length }) },
  });
}
