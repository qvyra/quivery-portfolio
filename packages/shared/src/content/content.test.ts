import { describe, expect, it } from "vitest";
import { blocksSchema, resolvedBlockSchema } from "./blocks.js";
import { contactLinkInputSchema, testimonialInputSchema } from "./entities.js";
import { projectInputSchema } from "./project.js";
import { sectionInputSchema } from "./section.js";

const mediaId = "0b8f3c1e-6d2a-4f7b-9a51-3e2c8d4f6a10";

describe("blocksSchema", () => {
  it("accepts every block type", () => {
    const result = blocksSchema.safeParse([
      { id: "a", type: "richText", markdown: "# Hello" },
      { id: "b", type: "image", image: { mediaId }, caption: "Shot" },
      { id: "c", type: "video", video: { mediaId } },
      { id: "d", type: "gallery", items: [{ image: { mediaId } }] },
      {
        id: "e",
        type: "linkList",
        links: [
          {
            label: "Repo",
            url: "https://github.com/qvyra/geode",
            type: "repository",
          },
        ],
      },
      { id: "f", type: "statsRow", items: [{ value: "6", label: "Years" }] },
      { id: "g", type: "codeSnippet", language: "luau", code: "print('hi')" },
      {
        id: "h",
        type: "embed",
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "Demo",
      },
    ]);
    expect(result.success).toBe(true);
  });

  it("defaults video loop to false", () => {
    const [video] = blocksSchema.parse([
      { id: "v", type: "video", video: { mediaId } },
    ]);
    expect(video).toMatchObject({ loop: false });
  });

  it("rejects an unknown block type", () => {
    expect(blocksSchema.safeParse([{ id: "x", type: "marquee" }]).success).toBe(
      false,
    );
  });

  it("rejects duplicate block ids", () => {
    const result = blocksSchema.safeParse([
      { id: "same", type: "richText", markdown: "one" },
      { id: "same", type: "richText", markdown: "two" },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects an embed whose host does not match its provider", () => {
    const result = blocksSchema.safeParse([
      {
        id: "e",
        type: "embed",
        provider: "youtube",
        url: "https://evil.example/watch",
        title: "x",
      },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects non-http links", () => {
    const result = blocksSchema.safeParse([
      {
        id: "l",
        type: "linkList",
        links: [{ label: "x", url: "javascript:alert(1)", type: "other" }],
      },
    ]);
    expect(result.success).toBe(false);
  });

  it("resolved blocks carry the media (or null when it is gone)", () => {
    expect(
      resolvedBlockSchema.safeParse({
        id: "b",
        type: "image",
        image: { mediaId, media: null },
      }).success,
    ).toBe(true);
  });
});

describe("input schemas are strict whitelists", () => {
  const project = {
    slug: "geode",
    title: "Geode",
    summary: "Data service",
    releaseStatus: "RELEASED",
  };

  it("applies safe defaults: new content starts as a visible draft", () => {
    expect(projectInputSchema.parse(project)).toMatchObject({
      publishStatus: "DRAFT",
      visible: true,
      sortOrder: 0,
      featured: false,
      isPlaceholder: false,
      body: [],
      links: [],
    });
  });

  it("rejects fields that are not in the whitelist", () => {
    expect(
      projectInputSchema.safeParse({ ...project, id: mediaId }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({ ...project, createdAt: "2026-01-01" })
        .success,
    ).toBe(false);
    expect(
      sectionInputSchema.safeParse({
        slug: "a",
        type: "custom",
        title: "A",
        ownerId: "x",
      }).success,
    ).toBe(false);
  });

  it("accepts only numeric Roblox ids", () => {
    expect(
      projectInputSchema.safeParse({ ...project, robloxPlaceId: "1818" })
        .success,
    ).toBe(true);
    expect(
      projectInputSchema.safeParse({ ...project, robloxPlaceId: "12abc" })
        .success,
    ).toBe(false);
  });

  it("rejects bad slugs", () => {
    expect(
      projectInputSchema.safeParse({ ...project, slug: "Geode Lib" }).success,
    ).toBe(false);
  });

  it("limits testimonial ratings to 1-5", () => {
    const testimonial = { authorName: "A", quote: "Great" };
    expect(
      testimonialInputSchema.safeParse({ ...testimonial, rating: 5 }).success,
    ).toBe(true);
    expect(
      testimonialInputSchema.safeParse({ ...testimonial, rating: 6 }).success,
    ).toBe(false);
  });

  it("allows mailto and https contact links, nothing else", () => {
    const link = { type: "email", label: "Email", value: "me@example.com" };
    expect(
      contactLinkInputSchema.safeParse({
        ...link,
        url: "mailto:me@example.com",
      }).success,
    ).toBe(true);
    expect(
      contactLinkInputSchema.safeParse({ ...link, url: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });
});
