// Runs before three kinds of routes. Project and page URLs that weren't
// published at build time go straight to the static 404, and /admin gets its
// redirect to the sign-in page and a noindex header
import { isReservedPageSlug } from "@repo/shared";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin/cookie";

// two segments, so neither /[slug] nor /projects/[slug] matches it and Next
// serves the prerendered 404 page
const NOT_FOUND = "/_unknown/page";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) return admin(request);
  if (pathname.startsWith("/projects/")) return project(request);
  return page(request);
}

// whether a slug was published when this build ran, true in dev where
// nothing is snapshot (scripts/build.mjs sets these)
function publishedAtBuild(snapshot: string | undefined, slug: string) {
  return !snapshot || (JSON.parse(snapshot) as string[]).includes(slug);
}

// Rendering a 404 inside the project route would need the site data from the
// API, and functions don't share a cache, so every made-up slug would wake it
function project(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  // inlined by next.config.ts from the build's snapshot
  return publishedAtBuild(process.env.PUBLISHED_PROJECT_SLUGS, slug)
    ? NextResponse.next()
    : NextResponse.rewrite(new URL(NOT_FOUND, request.url));
}

// Same for standalone pages at /<slug>. Reserved slugs are the site's own
// routes (or nothing), metadata images among them, so they go on to Next's
// routing untouched
function page(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice(1);
  if (isReservedPageSlug(slug)) return NextResponse.next();
  return publishedAtBuild(process.env.PUBLISHED_PAGE_SLUGS, slug)
    ? NextResponse.next()
    : NextResponse.rewrite(new URL(NOT_FOUND, request.url));
}

// A convenience only: without a session cookie the panel's pages would just
// fail, so they go to the sign-in page. What actually keeps the admin closed
// is the API's session check behind every /admin/api call
function admin(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const page =
    !pathname.startsWith("/admin/api/") && pathname !== "/admin/login";
  const response =
    page && !request.cookies.has(SESSION_COOKIE)
      ? NextResponse.redirect(new URL("/admin/login", request.url))
      : NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  // a top-level path made of lowercase letters, digits and dashes, so
  // files such as /favicon.ico and /sitemap.xml never run this
  matcher: ["/projects/:slug", "/:slug([a-z0-9-]+)", "/admin", "/admin/:path*"],
};
