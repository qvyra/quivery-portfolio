// Sends unknown project URLs to the static 404 page before the project route
// renders. Rendering a 404 inside that route would need the site data from the
// API, and functions don't share a cache, so every made-up slug would wake it
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // inlined by next.config.ts from the build's snapshot, unset in dev
  const published = process.env.PUBLISHED_PROJECT_SLUGS;
  if (!published) return NextResponse.next();

  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  if ((JSON.parse(published) as string[]).includes(slug)) {
    return NextResponse.next();
  }
  // no route matches this path, so Next serves the prerendered 404 page
  return NextResponse.rewrite(new URL("/_unknown-project", request.url));
}

export const config = {
  matcher: "/projects/:slug",
};
