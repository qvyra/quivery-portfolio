"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";

/**
 * What error boundaries show: the site's look, a retry and a way home. The
 * reference is the digest Next logs on the server, so a report can be matched
 * to its log line
 */
export function ErrorContent({
  error,
  retry,
  home = "/",
  homeLabel = "Back to the homepage",
  landmark = true,
}: {
  error: unknown;
  retry: () => void;
  home?: string;
  homeLabel?: string;
  /** false where a layout already provides the <main>, like the admin */
  landmark?: boolean;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest =
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;

  const Outer = landmark ? "main" : "div";

  return (
    <Outer
      id={landmark ? "main" : undefined}
      className="flex flex-1 items-center"
    >
      <Container className="py-section">
        <div className="max-w-[40rem] space-y-6">
          <Eyebrow className="animate-enter">Error</Eyebrow>
          <h1 className="animate-enter text-display font-semibold [--i:1]">
            Something <span className="text-gradient">went wrong.</span>
          </h1>
          <p className="animate-enter text-lead text-white/75 [--i:2]">
            This page didn&apos;t load properly. Trying again usually fixes it.
          </p>
          <div className="flex animate-enter flex-wrap gap-3 pt-3 [--i:3]">
            <Button size="lg" onClick={() => retry()}>
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
            <ButtonLink href={home} size="lg" variant="secondary">
              <ArrowLeft aria-hidden="true" />
              {homeLabel}
            </ButtonLink>
          </div>
          {digest && (
            <p className="animate-enter pt-4 text-sm text-white/60 [--i:4]">
              Reference: <code>{digest}</code>
            </p>
          )}
        </div>
      </Container>
    </Outer>
  );
}
