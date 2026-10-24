// The Open Graph card shared by every page: brand background, the Q, a title,
// a line of text and a row of badges. Rendered by next/og (Satori), which
// only knows flexbox and needs TrueType fonts
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { ImageResponse } from "next/og";
import { env } from "@/lib/env";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export type OgBadge = { label: string; dot?: "released" | "progress" };

const dots = { released: "#34d399", progress: "#fbbf24" };

// files are read relative to the app, so the deploy traces them in
const file = (path: string) => readFile(join(process.cwd(), path));

async function qMark(): Promise<string> {
  const svg = (await file("icons/q.svg")).toString("utf8");
  // the accent gradient instead of the flat pink
  const filled = svg
    .replace(
      /<svg([^>]*)>/,
      `<svg$1><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dc00ff"/><stop offset="1" stop-color="#c2005a"/></linearGradient></defs>`,
    )
    .replace(/fill="#[0-9a-fA-F]{6}"/, 'fill="url(#g)"');
  return `data:image/svg+xml;base64,${Buffer.from(filled).toString("base64")}`;
}

// Satori has no line clamping, so long text is cut at a word
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, text.lastIndexOf(" ", max - 1));
  return `${cut.replace(/[\s,;:.]+$/, "")}…`;
}

export type OgCard = {
  eyebrow: string;
  title: string;
  text: string;
  badges: OgBadge[];
};

/**
 * The card as a PNG response. It's rendered once and kept until one of
 * `tags` is refreshed, like the page it belongs to
 */
export async function ogCard(card: OgCard, tags: string[]): Promise<Response> {
  const png = await cachedPng(card, tags);
  return new Response(png, { headers: { "Content-Type": ogContentType } });
}

// Reading the fonts and rendering are uncached work, which would turn the
// image into a request-time function. Cached, it prerenders with the page
async function cachedPng(
  card: OgCard,
  tags: string[],
): Promise<Uint8Array<ArrayBuffer>> {
  "use cache";
  cacheLife("max");
  cacheTag(...tags);
  const response = await render(card);
  return new Uint8Array(await response.arrayBuffer());
}

async function render({
  eyebrow,
  title,
  text,
  badges,
}: OgCard): Promise<ImageResponse> {
  const [regular, semibold, q] = await Promise.all([
    file("lib/og/fonts/poppins-400.ttf"),
    file("lib/og/fonts/poppins-600.ttf"),
    qMark(),
  ]);
  const host = new URL(env().siteUrl).host;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: "72px 80px",
        backgroundColor: "#0a001d",
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(121, 1, 140, 0.55), rgba(10, 0, 29, 0) 55%), radial-gradient(circle at 100% 100%, rgba(140, 1, 59, 0.5), rgba(10, 0, 29, 0) 55%)",
        color: "white",
        fontFamily: "Poppins",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          paddingRight: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#f5b8ff",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              width: 96,
              height: 5,
              marginTop: 18,
              borderRadius: 3,
              backgroundImage: "linear-gradient(90deg, #dc00ff, #c2005a)",
            }}
          />
          <div
            style={{
              marginTop: 40,
              fontSize: title.length > 24 ? 64 : 80,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -1,
            }}
          >
            {clip(title, 60)}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              lineHeight: 1.45,
              color: "rgba(255, 255, 255, 0.75)",
            }}
          >
            {clip(text, 130)}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 32,
          }}
        >
          {badges.map((badge) => (
            <div
              key={badge.label}
              style={{
                display: "flex",
                alignItems: "center",
                marginRight: 14,
                padding: "10px 22px",
                borderRadius: 999,
                fontSize: 24,
                fontWeight: 600,
                border: "2px solid rgba(255, 255, 255, 0.18)",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
              }}
            >
              {badge.dot && (
                <div
                  style={{
                    width: 12,
                    height: 12,
                    marginRight: 12,
                    borderRadius: 6,
                    backgroundColor: dots[badge.dot],
                  }}
                />
              )}
              {badge.label}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          width: 330,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Satori draws plain img elements, next/image doesn't apply here */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={q} width={300} height={372} alt="" />
        <div
          style={{
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          {host}
        </div>
      </div>
    </div>,
    {
      ...ogSize,
      fonts: [
        { name: "Poppins", data: regular, weight: 400, style: "normal" },
        { name: "Poppins", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
