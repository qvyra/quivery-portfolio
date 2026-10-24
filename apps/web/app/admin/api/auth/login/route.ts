// Signs in: the API checks the password and returns a session token, which
// goes into an httpOnly cookie here and never to the browser's JavaScript
import { cookies } from "next/headers";
import { adminLoginSchema } from "@repo/shared";
import {
  adminApi,
  clientIp,
  forbidden,
  reply,
  sameOrigin,
  sessionCookie,
} from "@/lib/admin/server";

// a sleeping API takes about 35 seconds to wake
export const maxDuration = 100;

type SignedIn = {
  data: {
    token: string;
    username: string;
    expiresAt: string;
    idleMinutes: number;
  };
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden();
  }
  const body = adminLoginSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return reply(
      400,
      "VALIDATION_FAILURE_LOGIN",
      "Enter your username and password.",
    );
  }

  const answer = await adminApi("/auth/login", {
    method: "POST",
    body: body.data,
    ip: clientIp(request),
  });
  if (answer.status !== 200) {
    return Response.json(answer.json, { status: answer.status });
  }

  const { token, ...session } = (answer.json as SignedIn).data;
  const maxAge = Math.max(
    0,
    Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000),
  );
  (await cookies()).set(sessionCookie(token, maxAge));
  return Response.json({
    status: 200,
    data: session,
    message: "Signed in.",
    code: "ADMIN_SIGNED_IN",
  });
}
