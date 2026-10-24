// Signs out: ends the session in the API and drops the cookie. The cookie
// goes even if the API can't be reached, and the session then just expires
import {
  adminApi,
  clearSession,
  forbidden,
  reply,
  sameOrigin,
  sessionToken,
} from "@/lib/admin/server";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden();
  }
  const token = await sessionToken();
  if (token) await adminApi("/auth/logout", { method: "POST", token });
  await clearSession();
  return reply(200, "ADMIN_SIGNED_OUT", "Signed out.");
}
