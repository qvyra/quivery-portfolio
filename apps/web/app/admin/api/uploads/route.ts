// Uploads. GET says where files go. POST hands the browser a short-lived
// Vercel Blob token for one file, so the file itself goes straight to the
// store and never through this site or the API (no multipart parsing anywhere)
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  adminApi,
  forbidden,
  reply,
  sameOrigin,
  sessionToken,
  signedOut,
} from "@/lib/admin/server";
import { allTypes, largestUpload, mediaStorage } from "@/lib/admin/storage";
import { env } from "@/lib/env";

export const maxDuration = 100;

async function signedIn(): Promise<boolean> {
  const token = await sessionToken();
  if (!token) return false;
  return (await adminApi("/auth/session", { token })).status === 200;
}

export async function GET() {
  if (!(await signedIn())) {
    return signedOut();
  }
  return Response.json({
    status: 200,
    data: { mode: mediaStorage()?.mode ?? "off" },
    message: "Upload mode.",
    code: "ADMIN_UPLOAD_MODE",
  });
}

export async function POST(request: Request) {
  const { blobToken } = env();
  if (!blobToken) {
    return reply(503, "UPLOADS_OFF", "No Blob store is connected.");
  }
  if (!sameOrigin(request)) {
    return forbidden();
  }

  try {
    const result = await handleUpload({
      body: (await request.json()) as HandleUploadBody,
      request,
      token: blobToken,
      // the media record is created by the browser right after, through
      // /admin/api/media, which checks the file with the store first. So no
      // upload-completed callback, which couldn't reach a dev machine anyway
      onBeforeGenerateToken: async () => {
        if (!(await signedIn())) throw new Error("Not signed in");
        return {
          // the exact limit per kind is checked when the file is registered
          allowedContentTypes: allTypes,
          maximumSizeInBytes: largestUpload,
          addRandomSuffix: true,
          // 10 minutes is plenty for one file
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload refused";
    return reply(400, "UPLOAD_REFUSED", message);
  }
}
