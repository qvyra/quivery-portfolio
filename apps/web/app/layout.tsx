import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { ogImage } from "@/lib/brand";
import { env } from "@/lib/env";
import { poppinsFiles } from "@/lib/fonts";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  // canonical and Open Graph URLs resolve against SITE_URL, so a custom
  // domain only needs an env change
  metadataBase: new URL(env().siteUrl),
  title: {
    default: "Quivery · Roblox systems engineer",
    template: "%s · Quivery",
  },
  description:
    "Quivery (Ether): Roblox systems engineer focused on data, architecture and tooling for live games.",
  // TODO: per-page Open Graph images, these are placeholders
  openGraph: {
    type: "website",
    siteName: "Quivery",
    locale: "en",
    images: [
      {
        url: ogImage.src,
        width: ogImage.width,
        height: ogImage.height,
        alt: "The Quivery Q logo",
      },
    ],
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#0a001d",
  colorScheme: "dark",
  // lets the layout reach under notches, safe-area insets pad the content
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // semibold sets the h1 and buttons, the largest text on first paint. The
  // other weights swap in over a fallback sized to match, so nothing moves
  preload(poppinsFiles[600], {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });

  return (
    <html
      lang="en"
      // smooth anchor scrolling from CSS, but not during route changes
      data-scroll-behavior="smooth"
      className="antialiased"
    >
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
