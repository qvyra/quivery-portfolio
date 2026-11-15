import { describe, expect, it } from "vitest";
import { blocksSchema, resolvedBlockSchema } from "./blocks.js";
import { linkSchema } from "./common.js";
import {
  contactLinkInputSchema,
  cvFileNameSchema,
  profileInputSchema,
  profileSchema,
  testimonialInputSchema,
} from "./entities.js";
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

  it("leaves image blocks that don't use the new options as they were", () => {
    // no defaults added, or a site built before them would refuse the block
    const [image] = blocksSchema.parse([
      { id: "i", type: "image", image: { mediaId } },
    ]);
    expect(image).toEqual({ id: "i", type: "image", image: { mediaId } });
  });

  it("accepts a mobile image, and rejects one without a media id", () => {
    const block = { id: "i", type: "image", image: { mediaId }, wide: true };
    expect(
      blocksSchema.safeParse([{ ...block, mobileImage: { mediaId } }]).success,
    ).toBe(true);
    expect(
      blocksSchema.safeParse([{ ...block, mobileImage: { mediaId: null } }])
        .success,
    ).toBe(false);
    expect(
      resolvedBlockSchema.safeParse({
        ...block,
        image: { mediaId, media: null },
        mobileImage: { mediaId, media: null },
      }).success,
    ).toBe(true);
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

describe("links on this site", () => {
  const link = (url: string) =>
    linkSchema.safeParse({ label: "Architecture", url, type: "internal" });
  const problem = (url: string) => link(url).error?.issues[0];

  it("takes a path from the root, with or without an anchor", () => {
    for (const url of [
      "/",
      "/projects/geode",
      "/architecture",
      "/architecture#guards",
      "/#works",
    ]) {
      expect(link(url).success, url).toBe(true);
    }
  });

  it("turns away full URLs with a hint to use another link type", () => {
    const issue = problem("https://quivery.dev/projects/geode");
    expect(issue?.path).toEqual(["url"]);
    expect(issue?.message).toMatch(/full URL\. Pick another link type/);
  });

  it("turns away anything a browser would read as another site", () => {
    for (const url of [
      "//evil.example",
      "/\\evil.example",
      "projects/geode",
      "javascript:alert(1)",
      "/a b",
    ]) {
      expect(link(url).success, url).toBe(false);
    }
  });

  it("still needs an http URL for every other type", () => {
    expect(
      linkSchema.safeParse({
        label: "x",
        url: "/projects/geode",
        type: "website",
      }).success,
    ).toBe(false);
    expect(
      linkSchema.safeParse({
        label: "x",
        url: "https://example.com",
        type: "website",
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

describe("CV download file name", () => {
  it.each(["Badreddine-Zitouni-CV.pdf", "CV 2026.PDF", "Zitouni (CV).pdf"])(
    "accepts %s",
    (name) => {
      expect(cvFileNameSchema.safeParse(name).success).toBe(true);
    },
  );

  it.each([
    ["no .pdf ending", "cv.docx"],
    ["only an extension", ".pdf"],
    ["a hidden file", ".cv.pdf"],
    ["a path", "../cv.pdf"],
    ["a quote, which would break the header", 'my "cv".pdf'],
    ["a backslash", "a\\cv.pdf"],
    ["a line break", "cv\n.pdf"],
    ["too long", `${"a".repeat(97)}.pdf`],
  ])("refuses %s", (_, name) => {
    expect(cvFileNameSchema.safeParse(name).success).toBe(false);
  });

  it("is optional on the profile, so stored profiles stay valid", () => {
    const profile = {
      brandName: "Quivery",
      displayName: "Quivery",
      headline: "Roblox systems engineer",
      tagline: "Tagline",
    };
    expect(profileInputSchema.parse(profile)).not.toHaveProperty("cvFileName");
    expect(
      profileSchema.parse({ ...profile, avatar: null, cv: null }).cvFileName,
    ).toBeNull();
  });
});
