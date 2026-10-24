"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// visitors only: the admin is Ether's own traffic, and its URLs carry ids
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
