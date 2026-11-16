import type { ContactLink, Profile } from "@repo/shared";
import { ArrowUp } from "lucide-react";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { wordmark } from "@/lib/brand";
import { hasSeparateName } from "@/lib/seo";
import { CvButton } from "./cv-button";
import { socialItems } from "./social-items";
import { SocialLinks } from "./social-links";

// cached like the rest of the page, since a shorter lifetime would shorten
// every page's and make visitors wait on a fresh render (and the API) once it
// expired. Content refreshes and the 30-day revalidation keep it current
async function Year() {
  "use cache";
  cacheLife("max");
  return <>{new Date().getFullYear()}</>;
}

/** Brand, social links and copyright. No admin links, on purpose */
export function SiteFooter({
  profile,
  contactLinks,
}: {
  profile: Profile;
  contactLinks: ContactLink[];
}) {
  const socials = socialItems(contactLinks);

  return (
    <footer className="mt-auto border-t border-white/10 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Container className="flex flex-col gap-8 pt-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Link
            href="/"
            aria-label={`${profile.brandName}, home`}
            className="inline-block rounded-sm"
          >
            <Image
              src={wordmark.src}
              alt=""
              width={wordmark.width}
              height={wordmark.height}
              className="h-8 w-auto"
            />
          </Link>
          {/* the wordmark above already reads as the brand */}
          <p className="text-white/65">
            {hasSeparateName(profile)
              ? `${profile.displayName} · ${profile.headline}`
              : profile.headline}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 empty:hidden">
          {socials.length > 0 && <SocialLinks items={socials} />}
          {/* as tall as the round social links beside it */}
          <CvButton profile={profile} className="btn btn-secondary min-h-12" />
        </div>
      </Container>
      <Container className="mt-10 flex flex-wrap items-center justify-between gap-4 text-sm text-white/55">
        <p>
          © <Year /> {profile.brandName}. All rights reserved.
        </p>
        <a
          href="#main"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm hover:text-white"
        >
          Back to top
          <ArrowUp aria-hidden="true" className="size-4" />
        </a>
      </Container>
    </footer>
  );
}
