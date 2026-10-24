// The admin's server side. The browser only ever talks to /admin/api/* on this
// site; these helpers forward to the API with the admin secret and the
// session token from the cookie, so neither ever reaches the browser
import "server-only";
import { isIP } from "node:net";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "./cookie";

const production = process.env.NODE_ENV === "production";

// scoped to /admin, so no other page or route ever receives it

export function sessionCookie(token: string, maxAgeSeconds: number) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: production,
    path: "/admin",
    maxAge: maxAgeSeconds,
  };
}

export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSession() {
  (await cookies()).set(sessionCookie("", 0));
}

export const reply = (status: number, code: string, message: string) =>
  Response.json({ status, message, code }, { status });

export const forbidden = () =>
  reply(403, "ADMIN_FORBIDDEN", "Requests have to come from this site.");

export const signedOut = () =>
  reply(401, "ADMIN_SESSION_EXPIRED", "Your session has ended. Sign in again.");

/**
 * A request that changes something has to come from this site's own pages.
 * SameSite=Strict already keeps the cookie off cross-site requests, this
 * refuses them outright as well
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  // the host the browser addressed. A cross-site page can't change it, and
  // request.url can't be used: next start builds it from its own hostname
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host || origin === env().siteUrl;
  } catch {
    return false;
  }
}

// Vercel sets x-real-ip itself, so a visitor can't choose it
export function clientIp(request: Request): string | null {
  const ip = request.headers.get("x-real-ip")?.trim();
  return ip && isIP(ip) ? ip : null;
}

export type ApiAnswer = { status: number; json: unknown };

/** Calls the API's /admin/* with the secret and, if signed in, the session */
export async function adminApi(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    token?: string | null;
    ip?: string | null;
  } = {},
): Promise<ApiAnswer> {
  const { apiUrl, adminApiSecret } = env();
  if (!adminApiSecret) {
    return {
      status: 503,
      json: {
        status: 503,
        code: "ADMIN_DISABLED",
        message: "ADMIN_API_SECRET is not set, so the admin is off.",
      },
    };
  }
  try {
    const response = await fetch(`${apiUrl}/admin${path}`, {
      method: init.method ?? "GET",
      headers: {
        "x-admin-secret": adminApiSecret,
        ...(init.token && { "x-admin-session": init.token }),
        ...(init.ip && { "x-client-ip": init.ip }),
        ...(init.body !== undefined && { "content-type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // a sleeping API takes about 35 seconds to wake
      signal: AbortSignal.timeout(90_000),
      cache: "no-store",
    });
    return {
      status: response.status,
      json: await response.json().catch(() => null),
    };
  } catch {
    return {
      status: 502,
      json: {
        status: 502,
        code: "ADMIN_API_UNREACHABLE",
        message: "The API didn't answer. It may be waking up, try again.",
      },
    };
  }
}

/** Passes the API's answer on, signing out locally when the session ended */
export async function forward(answer: ApiAnswer): Promise<Response> {
  if (answer.status === 401) await clearSession();
  return Response.json(answer.json, { status: answer.status });
}
