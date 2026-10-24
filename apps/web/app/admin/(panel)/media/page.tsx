import type { Metadata } from "next";
import { MediaLibrary } from "@/components/admin/pages";

export const metadata: Metadata = { title: "Media" };

export default function MediaPage() {
  return <MediaLibrary />;
}
