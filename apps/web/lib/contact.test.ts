import type { ContactLink, ContactLinkType } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { primaryContact, socialLinks } from "./contact";

const link = (type: ContactLinkType, featured = false): ContactLink => ({
  id: `00000000-0000-4000-8000-${type.length.toString().padStart(12, "0")}`,
  type,
  label: type,
  value: type,
  url: "https://example.com",
  featured,
  iconKey: null,
  icon: null,
});

describe("socialLinks", () => {
  it("keeps the types with a round icon, in stored order", () => {
    const links = ["website", "linkedin", "github", "other"].map((type) =>
      link(type as ContactLinkType),
    );
    expect(socialLinks(links).map((l) => l.type)).toEqual([
      "linkedin",
      "github",
    ]);
  });
});

describe("primaryContact", () => {
  it("prefers LinkedIn over GitHub, which can't be messaged", () => {
    const result = primaryContact([link("github"), link("linkedin")]);
    expect(result).toMatchObject({
      link: { type: "linkedin" },
      label: "Connect on LinkedIn",
    });
  });

  it("takes the featured link first", () => {
    const result = primaryContact([link("linkedin"), link("github", true)]);
    expect(result?.link.type).toBe("github");
  });
});
