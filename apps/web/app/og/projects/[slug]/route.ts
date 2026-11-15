import { getBuiltProjects } from "@/lib/content";
import { imageResponse, projectImage } from "@/lib/og/images";

// a project page's link preview, prerendered, see lib/og/previews.ts
export async function generateStaticParams() {
  const projects = await getBuiltProjects();
  // at least one param set, like the page, so an empty build still works
  return projects.length > 0
    ? projects.map(({ slug }) => ({ slug }))
    : [{ slug: "none" }];
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/og/projects/[slug]">,
) {
  const { slug } = await params;
  return imageResponse(await projectImage(slug));
}
