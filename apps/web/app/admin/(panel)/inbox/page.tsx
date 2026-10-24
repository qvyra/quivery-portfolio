import type { Metadata } from "next";
import { Inbox } from "@/components/admin/pages";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return <Inbox />;
}
