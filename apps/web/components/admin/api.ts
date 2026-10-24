"use client";

// The panel's only way to the server: /admin/api/* on this site. A 401 means
// the session ended, so it goes back to the sign-in page

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

/** What a change did beyond saving, see the API's SiteUpdates */
export type DeployOutcome = "started" | "not-configured" | "failed";

export async function adminFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/admin/api${path}`, {
      method: init.method ?? "GET",
      headers:
        init.body === undefined
          ? undefined
          : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch {
    throw new AdminError("You seem to be offline.", 0, "OFFLINE");
  }
  const json = (await response.json().catch(() => null)) as {
    data?: T;
    message?: string;
    code?: string;
  } | null;

  if (response.status === 401) {
    // a full load on purpose, so no state from the ended session survives.
    // This module isn't a component, so there's no router here anyway
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/admin/login";
    throw new AdminError(
      "Your session has ended.",
      401,
      "ADMIN_SESSION_EXPIRED",
    );
  }
  if (!response.ok) {
    throw new AdminError(
      json?.message ?? `The server answered ${response.status}.`,
      response.status,
      json?.code ?? "ERROR",
    );
  }
  return json?.data as T;
}
