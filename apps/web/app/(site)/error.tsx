"use client";

import { ErrorContent } from "@/components/site/error-content";

// a page that failed, inside the site's header and footer
export default function SiteError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <ErrorContent error={error} retry={retry} />;
}
