"use client";

import { ErrorContent } from "@/components/site/error-content";

// an admin page that failed, inside the panel's navigation
export default function AdminError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <ErrorContent
      error={error}
      retry={retry}
      home="/admin"
      homeLabel="Back to the overview"
      landmark={false}
    />
  );
}
