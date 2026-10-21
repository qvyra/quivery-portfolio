import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";

/** 404 page body, used inside the site layout and on its own */
export function NotFoundContent() {
  return (
    <main id="main" className="flex flex-1 items-center">
      <Container className="py-section">
        <div className="max-w-[40rem] space-y-6">
          <Eyebrow className="animate-enter">Error 404</Eyebrow>
          <h1 className="animate-enter text-display font-semibold [--i:1]">
            This page <span className="text-gradient">doesn&apos;t exist.</span>
          </h1>
          <p className="animate-enter text-lead text-white/75 [--i:2]">
            The link may be old, or the project may not be published yet.
          </p>
          <div className="animate-enter pt-3 [--i:3]">
            <ButtonLink href="/" size="lg">
              <ArrowLeft aria-hidden="true" />
              Back to the homepage
            </ButtonLink>
          </div>
        </div>
      </Container>
    </main>
  );
}
