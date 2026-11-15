import type { Profile } from "@repo/shared";

/** Where the current CV lives. Links sent out point here, so it never moves */
export const CV_PATH = "/cv";

/** What /cv serves, or null while no PDF is picked */
export type CvFile = { id: string; url: string; fileName: string };

export function cvFile(profile: Profile): CvFile | null {
  const { cv } = profile;
  // the admin only lets a PDF be the CV, this keeps an older choice out too
  if (!cv || cv.mimeType !== "application/pdf") return null;
  return {
    id: cv.id,
    url: cv.url,
    fileName: profile.cvFileName ?? defaultFileName(profile.displayName),
  };
}

// "Quivery" becomes Quivery-CV.pdf
function defaultFileName(displayName: string): string {
  const name = displayName
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${name || "CV"}${name ? "-CV" : ""}.pdf`;
}

/**
 * A Content-Disposition value with the name twice: plain ASCII for old
 * clients, and the exact name (RFC 5987) for everything else
 */
export function contentDisposition(
  type: "inline" | "attachment",
  fileName: string,
): string {
  const ascii = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\]/g, "")
    .trim();
  const exact = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${ascii || "CV.pdf"}"; filename*=UTF-8''${exact}`;
}
