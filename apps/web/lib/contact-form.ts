import "server-only";
import {
  CONTACT_LIMITS,
  contactTopicLabels,
  type ContactLink,
  type ContactTopic,
} from "@repo/shared";
import type { ContactFallback } from "@/components/site/contact-form";

/**
 * What the contact form needs from the server: the topics and limits from
 * the shared schema, passed down so Zod stays out of the page's first load,
 * and the direct channels it offers when sending fails. Server only, since
 * importing @repo/shared values into client code would bundle Zod
 */
export function contactFormProps(links: ContactLink[]) {
  const fallbacks: ContactFallback[] = [];
  for (const kind of ["discord", "email"] as const) {
    const link = links.find((l) => l.type === kind && l.url);
    if (link?.url) {
      fallbacks.push({
        kind,
        label: kind === "discord" ? "Discord" : link.value,
        href: link.url,
      });
    }
  }
  return {
    topics: (Object.keys(contactTopicLabels) as ContactTopic[]).map(
      (value) => ({ value, label: contactTopicLabels[value] }),
    ),
    limits: {
      name: CONTACT_LIMITS.name,
      email: CONTACT_LIMITS.email,
      message: CONTACT_LIMITS.message,
    },
    fallbacks,
  };
}
