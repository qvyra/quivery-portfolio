import {
  contactLinkTypeSchema,
  iconKeySchema,
  linkTypeSchema,
  type Media,
  type ResolvedLink,
} from "@repo/shared";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LinkIcon } from "@/components/ui/link-icon";
import { hasSiteIcon, SiteIcon } from "@/components/ui/site-icon";
import { contactTypeIcons, linkTypeIcon, sectionTypeIcons } from "./defaults";
import { iconLibrary, libraryIcon } from "./library";

const upload: Media = {
  id: "00000000-0000-4000-8000-000000000001",
  kind: "IMAGE",
  url: "/uploads/icon.png",
  mimeType: "image/png",
  width: 64,
  height: 64,
  alt: "Our logo",
  captionsUrl: null,
};

describe("iconLibrary", () => {
  it("has unique keys content can store", () => {
    const keys = iconLibrary.map((icon) => icon.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(iconKeySchema.parse(key)).toBe(key);
  });

  it("draws every icon in one colour, in a square box, with nothing active", () => {
    for (const icon of iconLibrary) {
      const [, , w, h] = icon.viewBox.split(" ").map(Number);
      expect(w, icon.key).toBe(h);
      // white on the site comes from currentColor, so no colour of its own
      const colours = icon.body.match(/(?:fill|stroke)="([^"]+)"/g) ?? [];
      for (const colour of colours) {
        expect(colour, icon.key).toMatch(/"(currentColor|none)"$/);
      }
      expect(icon.body, icon.key).not.toMatch(/<script|<style|\son\w+=|href=/i);
      expect(icon.source && icon.license, icon.key).toBeTruthy();
    }
  });

  it("keeps the nav icon names sections stored before the library", () => {
    for (const key of [
      "layers",
      "network",
      "workflow",
      "drafting-compass",
      "user",
      "book-open",
    ]) {
      expect(libraryIcon(key), key).not.toBeNull();
    }
  });

  it("has every type's default icon", () => {
    for (const type of linkTypeSchema.options) {
      expect(
        libraryIcon(linkTypeIcon(type, "https://example.com")),
        type,
      ).not.toBeNull();
    }
    for (const type of contactLinkTypeSchema.options) {
      expect(libraryIcon(contactTypeIcons[type]), type).not.toBeNull();
    }
    for (const key of Object.values(sectionTypeIcons)) {
      expect(libraryIcon(key), key).not.toBeNull();
    }
  });

  it("knows nothing of unknown keys", () => {
    expect(libraryIcon("not-an-icon")).toBeNull();
    expect(libraryIcon(null)).toBeNull();
  });
});

describe("linkTypeIcon", () => {
  it("gives a GitHub repository the GitHub mark", () => {
    expect(linkTypeIcon("repository", "https://github.com/qvyra/geode")).toBe(
      "github",
    );
    expect(linkTypeIcon("repository", "https://gitlab.com/x/y")).toBe(
      "repository",
    );
    expect(linkTypeIcon("repository", "not a url")).toBe("repository");
  });
});

describe("SiteIcon", () => {
  it("draws a library icon inline, decorative and in currentColor", () => {
    const html = renderToString(<SiteIcon iconKey="rojo" />);
    expect(html).toContain('data-icon="rojo"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('fill="currentColor"');
  });

  it("shows an upload as uploaded, over any key", () => {
    const html = renderToString(<SiteIcon iconKey="rojo" media={upload} />);
    expect(html).toContain("site-icon-image");
    expect(html).not.toContain("data-icon");
    // the label beside it names the thing
    expect(html).toContain('alt=""');
  });

  it("falls back only when nothing was picked", () => {
    expect(renderToString(<SiteIcon fallback="mail" />)).toContain(
      'data-icon="mail"',
    );
    expect(
      renderToString(<SiteIcon iconKey="github" fallback="mail" />),
    ).toContain('data-icon="github"');
    // a key this site doesn't know shows nothing, not the fallback
    expect(
      renderToString(<SiteIcon iconKey="from-the-future" fallback="mail" />),
    ).toBe("");
  });

  it("reports whether there's anything to frame", () => {
    expect(hasSiteIcon("luau", null)).toBe(true);
    expect(hasSiteIcon(null, upload)).toBe(true);
    expect(hasSiteIcon("from-the-future", null)).toBe(false);
    expect(hasSiteIcon(null, null)).toBe(false);
  });
});

describe("LinkIcon", () => {
  const link: ResolvedLink = {
    label: "Source",
    url: "https://github.com/qvyra/geode",
    type: "repository",
  };

  it("uses the type's icon until one is picked", () => {
    expect(renderToString(<LinkIcon link={link} />)).toContain(
      'data-icon="github"',
    );
    expect(
      renderToString(
        <LinkIcon link={{ ...link, icon: { kind: "icon", key: "wally" } }} />,
      ),
    ).toContain('data-icon="wally"');
  });

  it("shows the type's icon when a picked upload was deleted", () => {
    const html = renderToString(
      <LinkIcon
        link={{ ...link, icon: { kind: "media", id: upload.id, media: null } }}
      />,
    );
    expect(html).toContain('data-icon="github"');
  });

  it("shows a picked upload", () => {
    const html = renderToString(
      <LinkIcon
        link={{
          ...link,
          icon: { kind: "media", id: upload.id, media: upload },
        }}
      />,
    );
    expect(html).toContain("site-icon-image");
  });
});
