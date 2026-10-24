import type { MetadataRoute } from "next";

// the icons are rendered by scripts/generate-icons.mjs
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quivery",
    short_name: "Quivery",
    description:
      "Quivery: Roblox systems engineer focused on data, architecture and tooling for live games.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A001D",
    theme_color: "#0A001D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
