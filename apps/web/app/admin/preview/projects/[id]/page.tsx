// A project page as it will look once its draft is published. By id, since a
// draft can rename the project
import { parseProject } from "@repo/shared";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProjectArticle } from "@/components/site/project-article";
import { adminApi, sessionToken } from "@/lib/admin/server";
import { PreviewNotice } from "../../page";

export const metadata: Metadata = { title: "Preview" };

async function ProjectPreview({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, token] = await Promise.all([params, sessionToken()]);
  if (!token) redirect("/admin/login");
  const answer = await adminApi(`/preview/projects/${encodeURIComponent(id)}`, {
    token,
  });
  if (answer.status !== 200) {
    return (
      <PreviewNotice>
        The preview couldn&apos;t load ({answer.status}). Try saving again.
      </PreviewNotice>
    );
  }
  return (
    <>
      <PreviewNotice>Preview: unpublished changes included</PreviewNotice>
      <main id="main">
        <ProjectArticle
          project={parseProject(answer.json)}
          backHref="/admin/preview"
        />
      </main>
    </>
  );
}

export default function ProjectPreviewPage({
  params,
}: PageProps<"/admin/preview/projects/[id]">) {
  return (
    <Suspense fallback={<PreviewNotice>Loading the preview…</PreviewNotice>}>
      <ProjectPreview params={params} />
    </Suspense>
  );
}
