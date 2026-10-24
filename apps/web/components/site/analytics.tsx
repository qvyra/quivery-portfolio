"use client";

// the React build, not the Next one: that reads the URL during render, and
// with Cache Components its boundary stays an empty hole in prerendered pages,
// so the script never loaded. The script tracks navigation by itself
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";

// visitors only: the admin is Quivery's own traffic, and its URLs carry ids.
// Only public pages render this, so it's a backstop
function skipAdmin(event: BeforeSendEvent): BeforeSendEvent | null {
  return new URL(event.url).pathname.startsWith("/admin") ? null : event;
}

/**
 * Vercel Web Analytics: page views, no cookies. Free on Hobby up to its
 * monthly limit, after which collection pauses rather than bills
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={skipAdmin} />;
}
