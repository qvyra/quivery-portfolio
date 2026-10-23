// The contact form posts here, and this hands the message to the API server
// to server with the shared secret. The browser never talks to the API, so
// the secret stays on the server and the API can trust the IP sent with it
import { isIP } from "node:net";
import { contactSubmissionSchema } from "@repo/shared";
import { env } from "@/lib/env";

// a sleeping API takes about 35 seconds to wake, and the form waits up to 90
export const maxDuration = 120;

const reply = (status: number, code: string, message: string) =>
  Response.json({ status, message, code }, { status });

// Vercel sets x-real-ip to the visitor's address itself, so a visitor can't
// pick it. Unset in dev, where the API falls back to the connection's address
function clientIp(request: Request): string | null {
  const ip = request.headers.get("x-real-ip")?.trim();
  return ip && isIP(ip) ? ip : null;
}

export async function POST(request: Request) {
  const { apiUrl, contactApiSecret } = env();
  if (!contactApiSecret) {
    return reply(
      503,
      "CONTACT_DISABLED",
      "CONTACT_API_SECRET is not set, so the contact form is off.",
    );
  }

  // checked here too, so a bad request never wakes the API. Same error shape
  // as the API's
  const parsed = contactSubmissionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") || "field";
    return reply(
      400,
      `VALIDATION_FAILURE_${field.toUpperCase()}`,
      `${field}: ${issue?.message ?? "Invalid input"}`,
    );
  }

  const ip = clientIp(request);
  try {
    const response = await fetch(`${apiUrl}/contact`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-contact-secret": contactApiSecret,
        ...(ip && { "x-client-ip": ip }),
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(90_000),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!body) {
      return reply(502, "CONTACT_UPSTREAM_ERROR", "The server sent no answer.");
    }
    return Response.json(body, {
      status: response.status,
      headers: retryAfter(response),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return timedOut
      ? reply(504, "CONTACT_TIMEOUT", "The server took too long to answer.")
      : reply(502, "CONTACT_UPSTREAM_ERROR", "The server couldn't be reached.");
  }
}

// the throttler names its headers after each limit, like Retry-After-hour
function retryAfter(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of response.headers) {
    if (name.startsWith("retry-after")) headers[name] = value;
  }
  return headers;
}
