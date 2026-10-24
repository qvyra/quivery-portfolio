// Development uploads, when no Blob store is connected: the file is saved in
// public/uploads. Production never takes this path (mediaStorage returns
// null there without a store)
import {
  adminApi,
  forbidden,
  reply,
  sameOrigin,
  sessionToken,
  signedOut,
} from "@/lib/admin/server";
import {
  mediaStorage,
  saveLocalUpload,
  largestUpload,
} from "@/lib/admin/storage";

export async function POST(request: Request) {
  if (mediaStorage()?.mode !== "local") {
    return reply(
      404,
      "ADMIN_NOT_FOUND",
      "Local uploads are for development only.",
    );
  }
  if (!sameOrigin(request)) {
    return forbidden();
  }
  const token = await sessionToken();
  if (!token || (await adminApi("/auth/session", { token })).status !== 200) {
    return signedOut();
  }

  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > largestUpload) {
    return reply(
      400,
      "UPLOAD_REFUSED",
      "Send one file, within the size limit.",
    );
  }
  try {
    const url = await saveLocalUpload(file);
    return Response.json(
      { status: 201, data: { url }, message: "Uploaded.", code: "UPLOADED" },
      { status: 201 },
    );
  } catch (error) {
    return reply(
      400,
      "UPLOAD_REFUSED",
      error instanceof Error ? error.message : "Upload refused",
    );
  }
}
