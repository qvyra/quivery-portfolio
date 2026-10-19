"use client";

import type { ContactLink, ContactLinkType } from "@repo/shared";
import { Check, Mail } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { DiscordIcon, GithubIcon, KofiIcon } from "@/components/ui/icons";
import { socialLinks } from "@/lib/contact";

const icons: Partial<
  Record<ContactLinkType, ComponentType<{ className?: string }>>
> = {
  discord: DiscordIcon,
  github: GithubIcon,
  kofi: KofiIcon,
  email: Mail,
};

// 48px round targets. Only the hover overlay's opacity and a slight press
// scale animate
const itemClass = [
  "relative isolate grid size-12 place-items-center rounded-full bg-white/[0.04] text-white/85 ring-1 ring-white/15 ring-inset [&_svg]:size-5",
  "before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-white/10 before:opacity-0 before:transition-opacity before:duration-(--motion-base) before:ease-out-quart",
  "transition-[scale] duration-(--motion-fast) ease-out-quart hover:text-white hover:before:opacity-100 motion-safe:active:scale-95",
].join(" ");

/**
 * Row of round icon links. One without a URL, like a Discord handle, copies
 * its value instead
 */
export function SocialLinks({
  links,
  className,
}: {
  links: ContactLink[];
  className?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (link: ContactLink) => {
    try {
      await navigator.clipboard.writeText(link.value);
      setCopied(link.id);
    } catch {
      // clipboard unavailable (insecure context or denied), nothing to do
    }
  };

  return (
    <>
      <ul
        className={["flex flex-wrap gap-3", className]
          .filter(Boolean)
          .join(" ")}
      >
        {socialLinks(links).map((link) => {
          const Icon = icons[link.type]!;
          const external = link.url?.startsWith("http");
          return (
            <li key={link.id}>
              {link.url ? (
                <a
                  href={link.url}
                  className={itemClass}
                  aria-label={`${link.label}: ${link.value}${external ? " (opens in a new tab)" : ""}`}
                  {...(external && { target: "_blank", rel: "noreferrer" })}
                >
                  <Icon />
                </a>
              ) : (
                <button
                  type="button"
                  className={itemClass}
                  aria-label={`Copy ${link.label} ${link.value}`}
                  onClick={() => copy(link)}
                >
                  {copied === link.id ? <Check /> : <Icon />}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p role="status" className="sr-only">
        {copied ? "Copied to the clipboard" : ""}
      </p>
    </>
  );
}
