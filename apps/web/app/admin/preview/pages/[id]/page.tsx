// A standalone page as it will look once its draft is published. By id, since
// a draft can rename the page
import { parsePage } from "@repo/shared";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageArticle } from "@/components/site/page-article";
import { adminApi, sessionToken } from "@/lib/admin/server";
import { PreviewNotice } from "../../page";

export const metadata: Metadata = { title: "Preview" };

async function PagePreview({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, token] = await Promise.all([params, sessionToken()]);
  if (!token) redirect("/admin/login");
  const answer = await adminApi(`/preview/pages/${encodeURIComponent(id)}`, {
    token,
  });
  if (answer.status !== 200) {
    return (
      <PreviewNotice>
        The preview couldn&apos;t load ({answer.status}). Try saving again.
      </PreviewNotice>
    );
  }
  const page = parsePage(answer.json);
  return (
    <>
      <PreviewNotice>Preview: unpublished changes included</PreviewNotice>
      <main id="main">
        <PageArticle
          page={page}
          backHref="/admin/preview"
          backLabel="Back to the preview list"
        />
      </main>
    </>
  );
}

export default function PagePreviewPage({
  params,
}: PageProps<"/admin/preview/pages/[id]">) {
  return (
    <Suspense fallback={<PreviewNotice>Loading the preview…</PreviewNotice>}>
      <PagePreview params={params} />
    </Suspense>
  );
}
