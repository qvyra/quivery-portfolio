// Every other admin request: checked here (signed in, same origin), then
// forwarded to the API's /admin/* with the secret and the session. Only the
// areas the panel uses are forwarded
import {
  adminApi,
  forbidden,
  forward,
  reply,
  sameOrigin,
  sessionToken,
  signedOut,
} from "@/lib/admin/server";

export const maxDuration = 100;

const areas = new Set([
  "collections",
  "profile",
  "preview",
  "messages",
  "auth",
]);

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: Request, { params }: Context) {
  const { path } = await params;
  const [area] = path;
  // sign-in and sign-out have their own routes, only the session check is here
  const allowed =
    area !== undefined &&
    areas.has(area) &&
    (area !== "auth" || (path[1] === "session" && request.method === "GET"));
  if (!allowed) return reply(404, "ADMIN_NOT_FOUND", "No such admin route.");

  if (request.method !== "GET" && !sameOrigin(request)) {
    return forbidden();
  }
  const token = await sessionToken();
  if (!token) {
    return signedOut();
  }

  let body: unknown;
  if (request.method === "POST" || request.method === "PUT") {
    const text = await request.text();
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      return reply(
        400,
        "ADMIN_INVALID_JSON",
        "The request body isn't valid JSON.",
      );
    }
  }

  const search = new URL(request.url).search;
  return forward(
    await adminApi(`/${path.map(encodeURIComponent).join("/")}${search}`, {
      method: request.method,
      body,
      token,
    }),
  );
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
