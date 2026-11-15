import { describe, expect, it, vi } from "vitest";
import type { MediaStorage, StoredFile } from "./storage";

vi.mock("server-only", () => ({}));
const { contentMatches, uploadRules } = await import("./storage");

// a store holding one file with these bytes
const storeWith = (bytes: string): MediaStorage => ({
  mode: "local",
  describe: () => Promise.resolve(null),
  head: (_file, count) =>
    Promise.resolve(
      new Uint8Array(Buffer.from(bytes, "latin1")).slice(0, count),
    ),
  remove: () => Promise.resolve(),
});
const file = (contentType: string): StoredFile => ({
  url: "/uploads/cv.pdf",
  key: "uploads/cv.pdf",
  contentType,
  size: 1000,
});

describe("contentMatches", () => {
  it("accepts a real PDF", async () => {
    const store = storeWith("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj");
    expect(await contentMatches(store, file("application/pdf"))).toBe(true);
  });

  it("accepts a PDF whose header comes after a little junk, as readers do", async () => {
    const store = storeWith(`${" ".repeat(200)}%PDF-1.4`);
    expect(await contentMatches(store, file("application/pdf"))).toBe(true);
  });

  it("refuses something else named .pdf", async () => {
    const text = storeWith("this is plain text, not a PDF\n");
    const png = storeWith("\x89PNG\r\n\x1a\n");
    expect(await contentMatches(text, file("application/pdf"))).toBe(false);
    expect(await contentMatches(png, file("application/pdf"))).toBe(false);
  });

  it("refuses a header past the first 1 KB", async () => {
    const store = storeWith(`${" ".repeat(1100)}%PDF-1.4`);
    expect(await contentMatches(store, file("application/pdf"))).toBe(false);
  });

  it("refuses when the store can't be read", async () => {
    const store = {
      ...storeWith(""),
      head: () => Promise.reject(new Error("gone")),
    };
    expect(await contentMatches(store, file("application/pdf"))).toBe(false);
  });

  it("leaves types without a known signature to the type check", async () => {
    const store = storeWith("anything");
    expect(await contentMatches(store, file("text/vtt"))).toBe(true);
  });

  it("caps files, PDFs included, at 10 MB", () => {
    expect(uploadRules.FILE.types).toContain("application/pdf");
    expect(uploadRules.FILE.maxBytes).toBe(10 * 1024 * 1024);
  });
});
