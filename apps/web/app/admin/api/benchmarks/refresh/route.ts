// The admin's "Refresh benchmarks". Marks every benchmark render stale: the
// next visit still gets the cached page while a new one renders with fresh
// data, and if that fetch fails the old page stays
import { revalidateTag } from "next/cache";
import {
  adminApi,
  forbidden,
  sameOrigin,
  sessionToken,
  signedOut,
} from "@/lib/admin/server";
import { benchmarksTag } from "@/lib/benchmarks";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden();
  }
  const token = await sessionToken();
  // the cookie alone isn't proof, the API checks the session
  if (!token || (await adminApi("/auth/session", { token })).status !== 200) {
    return signedOut();
  }
  revalidateTag(benchmarksTag, "max");
  return Response.json({
    status: 200,
    data: null,
    message: "Benchmarks refresh on the next visit.",
    code: "BENCHMARKS_REFRESHED",
  });
}
