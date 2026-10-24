import { describe, expect, it } from "vitest";
import { blockTypeSchema, resolvedBlockSchema } from "./blocks.js";
import { embedPlayer } from "./embeds.js";
import { ContentSchemaError, parseProject, parseSite } from "./public-api.js";
import { sectionInputSchema } from "./section.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const section = (n: number, extra: Record<string, unknown>) => ({
  id: uuid(n),
  slug: `section-${n}`,
  title: `Section ${n}`,
  titleHighlight: null,
  eyebrow: null,
  navLabel: null,
  blocks: [],
  ...extra,
});

const ok = (data: unknown) => ({
  status: 200,
  message: "OK",
  code: "OK",
  data,
});

const site = (sections: unknown[]) =>
  ok({
    profile: {
      brandName: "Quivery",
      displayName: "Quivery",
      headline: "Roblox systems engineer",
      tagline: "Tagline",
      avatar: null,
      cv: null,
    },
    contactLinks: [],
    sections,
  });

describe("blockTypeSchema", () => {
  it("lists exactly the block union's types", () => {
    const unionTypes = resolvedBlockSchema.options.map(
      (option) => option.shape.type.value,
    );
    expect([...blockTypeSchema.options].sort()).toEqual(unionTypes.sort());
  });
});

describe("parseSite", () => {
  it("parses a valid site", () => {
    const parsed = parseSite(site([section(1, { type: "hero" })]));
    expect(parsed.sections).toHaveLength(1);
  });

  it("skips sections and blocks of unknown types and reports them", () => {
    const skipped: string[] = [];
    const parsed = parseSite(
      site([
        section(1, { type: "hero" }),
        section(2, { type: "marquee" }),
        section(3, {
          type: "custom",
          blocks: [
            { id: "a", type: "hologram" },
            { id: "b", type: "richText", markdown: "Hello" },
          ],
        }),
      ]),
      (message) => skipped.push(message),
    );
    expect(parsed.sections.map((s) => s.type)).toEqual(["hero", "custom"]);
    expect(parsed.sections[1]?.blocks).toHaveLength(1);
    expect(skipped).toHaveLength(2);
    expect(skipped[0]).toContain('"marquee"');
    expect(skipped[1]).toContain('"hologram"');
  });

  it("skips a custom section left without blocks", () => {
    const skipped: string[] = [];
    const parsed = parseSite(
      site([
        section(1, { type: "custom", blocks: [{ id: "a", type: "hologram" }] }),
      ]),
      (message) => skipped.push(message),
    );
    expect(parsed.sections).toHaveLength(0);
    expect(skipped).toHaveLength(2);
  });

  it("throws a ContentSchemaError when a known type doesn't match", () => {
    expect(() =>
      parseSite(site([section(1, { type: "stats", stats: [] })])),
    ).toThrow(ContentSchemaError);
    expect(() => parseSite({ status: 200 })).toThrow(ContentSchemaError);
  });
});

describe("parseProject", () => {
  it("drops unknown body blocks", () => {
    const skipped: string[] = [];
    const project = parseProject(
      ok({
        id: uuid(1),
        slug: "geode",
        title: "Geode",
        summary: "Summary",
        tags: [],
        links: [],
        releaseStatus: "RELEASED",
        version: "0.5.0",
        featured: true,
        openSource: true,
        isPlaceholder: false,
        benchmarkUrl: null,
        robloxPlaceId: null,
        robloxUniverseId: null,
        cover: null,
        updatedAt: "2026-10-23T00:00:00.000Z",
        body: [
          { id: "a", type: "richText", markdown: "Hi" },
          { id: "b", type: "hologram" },
        ],
        testimonials: [],
      }),
      (message) => skipped.push(message),
    );
    expect(project.body).toHaveLength(1);
    expect(skipped).toHaveLength(1);
  });
});

describe("sectionInputSchema titleHighlight", () => {
  const base = {
    slug: "hero",
    type: "hero",
    title: "The systems behind the gameplay.",
  };

  it("accepts a phrase of the title", () => {
    expect(
      sectionInputSchema.safeParse({ ...base, titleHighlight: "the gameplay." })
        .success,
    ).toBe(true);
  });

  it("rejects a phrase that isn't in the title", () => {
    expect(
      sectionInputSchema.safeParse({ ...base, titleHighlight: "the game play" })
        .success,
    ).toBe(false);
  });
});

describe("embedPlayer", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  ])("reads the YouTube id from %s", (url) => {
    expect(embedPlayer("youtube", url)).toEqual({
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    });
  });

  it("keeps a YouTube start time", () => {
    expect(
      embedPlayer("youtube", "https://youtu.be/dQw4w9WgXcQ?t=42")?.src,
    ).toContain("start=42");
  });

  it("builds Vimeo and Streamable players", () => {
    expect(embedPlayer("vimeo", "https://vimeo.com/76979871")?.src).toBe(
      "https://player.vimeo.com/video/76979871?autoplay=1&dnt=1",
    );
    expect(
      embedPlayer("streamable", "https://streamable.com/abc123")?.src,
    ).toBe("https://streamable.com/e/abc123?autoplay=1");
  });

  it("returns null when the URL isn't a video", () => {
    expect(
      embedPlayer("youtube", "https://www.youtube.com/@channel"),
    ).toBeNull();
    expect(embedPlayer("vimeo", "https://vimeo.com/about")).toBeNull();
  });
});
