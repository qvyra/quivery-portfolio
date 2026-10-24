"use client";

import Image from "next/image";
import Link from "next/link";
import { Backdrop } from "@/components/site/backdrop";
import { ErrorContent } from "@/components/site/error-content";
import { Container } from "@/components/ui/container";
import { wordmark } from "@/lib/brand";
import "./fonts.css";
import "./globals.css";

// When the root layout itself fails. It replaces the whole document, so it
// brings its own styles and fonts, and can't use the site header, which needs
// the API's content
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="flex min-h-dvh flex-col font-sans">
        <title>Something went wrong · Quivery</title>
        <Backdrop />
        <header>
          <Container className="flex h-18 items-center">
            <Link href="/" aria-label="Quivery, home" className="rounded-sm">
              <Image
                src={wordmark.src}
                width={wordmark.width}
                height={wordmark.height}
                alt=""
                loading="eager"
                className="h-[1.625rem] w-auto md:h-7 lg:h-8"
              />
            </Link>
          </Container>
        </header>
        <ErrorContent error={error} retry={retry} />
      </body>
    </html>
  );
}
