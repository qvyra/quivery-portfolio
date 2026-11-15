import type { Profile } from "@repo/shared";
import { FileDown } from "lucide-react";
import { CV_PATH, cvFile } from "@/lib/cv";

/**
 * Saves the current CV under its download file name, or renders nothing while
 * no CV is set. It links to /cv, never the stored file, so the file's own URL
 * stays out of the page
 */
export function CvButton({
  profile,
  className,
}: {
  profile: Profile;
  className: string;
}) {
  const cv = cvFile(profile);
  if (!cv) return null;
  return (
    // the server names the file too (Content-Disposition), this is a fallback
    <a
      href={`${CV_PATH}?download`}
      download={cv.fileName}
      className={className}
    >
      <FileDown aria-hidden="true" />
      Download CV
      <span className="sr-only"> (PDF)</span>
    </a>
  );
}
