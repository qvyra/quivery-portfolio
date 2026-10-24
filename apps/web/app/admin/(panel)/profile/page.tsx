import type { Metadata } from "next";
import { ProfileEditor } from "@/components/admin/pages";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <ProfileEditor />;
}
