import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ogImage } from "@/lib/brand";
import { env } from "@/lib/env";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  // regular, medium (numbers, nav) and semibold (headings, buttons). Each
  // extra weight is another font file on first load
  weight: ["400", "500", "600"],
  display: "swap",
});

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
  return (
    <html
      lang="en"
      // smooth anchor scrolling from CSS, but not during route changes
      data-scroll-behavior="smooth"
      className={`${poppins.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
