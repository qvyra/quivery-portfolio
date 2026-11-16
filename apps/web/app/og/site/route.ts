import { imageResponse, siteImage } from "@/lib/og/images";

// the homepage's link preview, prerendered, see lib/og/previews.ts
export async function GET() {
  return imageResponse(await siteImage());
}
