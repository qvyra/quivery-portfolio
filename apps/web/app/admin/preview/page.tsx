// The homepage as it will look once every draft is published, for the
// editor's preview pane. Rendered per request with the signed-in session, so
// it lives in a Suspense boundary and is never cached
import { parseSite } from "@repo/shared";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionList } from "@/components/sections/section-list";
import { adminApi, sessionToken } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Preview" };

export function PreviewNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="sticky top-0 z-50 bg-(--color-plum) px-4 py-2 text-center text-sm font-medium">
      {children}
    </p>
  );
}

async function SitePreview() {
  const token = await sessionToken();
  if (!token) redirect("/admin/login");
  const answer = await adminApi("/preview/site", { token });
  if (answer.status !== 200) {
    return (
      <PreviewNotice>
        The preview couldn&apos;t load ({answer.status}). Try saving again.
      </PreviewNotice>
    );
  }
  const site = parseSite(answer.json);
  return (
    <>
      <PreviewNotice>
        Preview: drafts and unpublished items included
      </PreviewNotice>
      <main id="main" className="pb-section">
        <SectionList site={site} />
      </main>
    </>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<PreviewNotice>Loading the preview…</PreviewNotice>}>
      <SitePreview />
    </Suspense>
  );
}
