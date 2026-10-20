import type { EmbedProvider } from "./blocks.js";

// what a click-to-load facade needs: the player, and a poster if the provider
// has a static one
export type EmbedPlayer = {
  // iframe src, autoplays since it only loads on click
  src: string;
  // poster image URL, null for a generic poster
  thumbnail: string | null;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function youtubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") return url.pathname.slice(1);
  if (url.pathname === "/watch") return url.searchParams.get("v");
  const [, kind, id] = url.pathname.split("/");
  return kind === "embed" || kind === "shorts" || kind === "live"
    ? (id ?? null)
    : null;
}

/**
 * Turns a stored (already host-checked) embed URL into a privacy-friendly
 * player URL. Null if it isn't a video, so the caller can fall back to a link
 */
export function embedPlayer(
  provider: EmbedProvider,
  rawUrl: string,
): EmbedPlayer | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  switch (provider) {
    case "youtube": {
      const id = youtubeId(url);
      if (!id || !YOUTUBE_ID.test(id)) return null;
      const start = Number.parseInt(url.searchParams.get("t") ?? "", 10);
      const params = new URLSearchParams({ autoplay: "1", rel: "0" });
      if (start > 0) params.set("start", String(start));
      return {
        // youtube-nocookie sets no tracking cookies until the video plays
        src: `https://www.youtube-nocookie.com/embed/${id}?${params}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
    case "vimeo": {
      const id = url.pathname.split("/").find((part) => /^\d+$/.test(part));
      return id
        ? {
            src: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`,
            thumbnail: null,
          }
        : null;
    }
    case "streamable": {
      const id = url.pathname.split("/").filter(Boolean).at(-1);
      return id && /^[a-z0-9]+$/i.test(id)
        ? { src: `https://streamable.com/e/${id}?autoplay=1`, thumbnail: null }
        : null;
    }
  }
}
