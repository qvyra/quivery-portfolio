// One file in the media library: edit its alt text and captions, or delete
// it. The API refuses to delete a file that's still used, and only once it has
// let go of the record is the file itself removed from the store
import {
  adminApi,
  forbidden,
  forward,
  sameOrigin,
  sessionToken,
  signedOut,
} from "@/lib/admin/server";
import { mediaStorage } from "@/lib/admin/storage";

type Context = { params: Promise<{ id: string }> };

async function guard(request: Request) {
  if (!sameOrigin(request)) {
    return {
      error: forbidden(),
    };
  }
  const token = await sessionToken();
  if (!token) {
    return {
      error: signedOut(),
    };
  }
  return { token };
}

export async function PUT(request: Request, { params }: Context) {
  const { token, error } = await guard(request);
  if (error) return error;
  const { id } = await params;
  return forward(
    await adminApi(`/media/${encodeURIComponent(id)}`, {
      method: "PUT",
      token,
      body: await request.json().catch(() => null),
    }),
  );
}

export async function DELETE(request: Request, { params }: Context) {
  const { token, error } = await guard(request);
  if (error) return error;
  const { id } = await params;
  const answer = await adminApi(`/media/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
  if (answer.status === 200) {
    const media = (
      answer.json as { data: { url: string; storageKey: string | null } }
    ).data;
    // static files that shipped with the site have no storage key, leave them
    if (media.storageKey) {
      await mediaStorage()
        ?.remove(media)
        .catch((cause: unknown) => {
          console.error(
            `[admin] Couldn't delete ${media.url} from storage`,
            cause,
          );
        });
    }
  }
  return forward(answer);
}
