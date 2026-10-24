// The media library. Registering a file asks the store what actually arrived
// (type and size) instead of trusting the browser, then the API records it
import { adminMediaRegisterSchema } from "@repo/shared";
import {
  adminApi,
  forbidden,
  forward,
  reply,
  sameOrigin,
  sessionToken,
  signedOut,
} from "@/lib/admin/server";
import { mediaStorage, uploadRules } from "@/lib/admin/storage";

export const maxDuration = 100;

export async function GET() {
  const token = await sessionToken();
  if (!token) {
    return signedOut();
  }
  return forward(await adminApi("/media", { token }));
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return forbidden();
  }
  const token = await sessionToken();
  if (!token) {
    return signedOut();
  }
  const body = adminMediaRegisterSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return reply(
      400,
      "VALIDATION_FAILURE_MEDIA",
      "That isn't a valid file record.",
    );
  }

  const storage = mediaStorage();
  const file = storage ? await storage.describe(body.data.url) : null;
  if (!storage || !file) {
    return reply(
      400,
      "UPLOAD_NOT_FOUND",
      "That file isn't in the media store.",
    );
  }
  const rules = uploadRules[body.data.kind];
  if (!rules.types.includes(file.contentType) || file.size > rules.maxBytes) {
    // not something this kind may be: take it back out of the store
    await storage
      .remove({ url: file.url, storageKey: file.key })
      .catch(() => {});
    return reply(
      400,
      "UPLOAD_REFUSED",
      `A ${body.data.kind.toLowerCase()} has to be ${rules.types.join(", ")}, up to ${Math.round(rules.maxBytes / 1024 / 1024)} MB.`,
    );
  }

  return forward(
    await adminApi("/media", {
      method: "POST",
      token,
      body: {
        ...body.data,
        url: file.url,
        mimeType: file.contentType,
        sizeBytes: file.size,
        storageKey: file.key,
      },
    }),
  );
}
