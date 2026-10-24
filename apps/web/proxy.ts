// Runs before two kinds of routes. Project URLs that weren't published at
// build time go straight to the static 404, and /admin gets its redirect to
// the sign-in page and a noindex header
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin/cookie";

export function proxy(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/admin")
    ? admin(request)
    : project(request);
}

// Rendering a 404 inside the project route would need the site data from the
// API, and functions don't share a cache, so every made-up slug would wake it
function project(request: NextRequest) {
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
  matcher: ["/projects/:slug", "/admin", "/admin/:path*"],
};
