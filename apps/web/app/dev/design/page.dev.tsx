// Design system preview. Only exists under next dev
import { parseSite, type ContactLink } from "@repo/shared";
import {
  ArrowRight,
  Mail,
  MousePointerClick,
  Palette,
  Sparkles,
  Type,
} from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Backdrop } from "@/components/site/backdrop";
import { HeroMark } from "@/components/site/hero-mark";
import { SiteHeader } from "@/components/site/site-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Eyebrow, SectionHeading } from "@/components/ui/section-heading";
import { Stat, StatList } from "@/components/ui/stat";

export const metadata: Metadata = {
  title: "Dev: design system",
  robots: { index: false, follow: false },
};

const navItems = [
  { label: "Tokens", href: "#tokens", icon: <Palette /> },
  { label: "Type", href: "#type", icon: <Type /> },
  { label: "Buttons", href: "#buttons", icon: <MousePointerClick /> },
  { label: "Motion", href: "#motion", icon: <Sparkles /> },
];

const API_URL = process.env.API_URL ?? "http://localhost:5005";

// live ContactLink rows, uncached, or none if the API isn't running
async function loadContactLinks(): Promise<ContactLink[]> {
  try {
    const response = await fetch(`${API_URL}/public/site`);
    return parseSite(await response.json()).contactLinks;
  } catch {
    return [];
  }
}

// ?links=sample previews the full social row with obviously fake values, since
// only GitHub is set in the real data so far
const sampleLinks: ContactLink[] = [
  ["discord", "Discord", "sample-handle", null],
  ["github", "GitHub", "qvyra", "https://github.com/qvyra"],
  ["kofi", "Ko-fi", "sample", "https://ko-fi.com/sample"],
  ["email", "Email", "hello@example.com", "mailto:hello@example.com"],
].map(([type, label, value, url], index) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  type: type as ContactLink["type"],
  label: label!,
  value: value!,
  url,
  featured: false,
}));

const swatches = [
  { name: "ink", hex: "#0a001d", note: "page background" },
  { name: "ink-raised", hex: "#14042e", note: "panels, drawer" },
  { name: "plum", hex: "#79018c", note: "primary gradient start" },
  { name: "wine", hex: "#8c013b", note: "primary gradient end" },
  { name: "orchid", hex: "#dc00ff", note: "accent start · 5.3:1" },
  { name: "rose", hex: "#c2005a", note: "accent end · 3.3:1" },
];

const radii = ["xs", "sm", "md", "lg", "xl", "full"] as const;
const radiusClass: Record<(typeof radii)[number], string> = {
  xs: "rounded-xs",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const sizes = ["sm", "md", "lg"] as const;

const motion = [
  ["Hover, press", "150–200ms", "ease-out-quart"],
  ["Menu, header", "200–250ms", "ease-out-quart / out-expo"],
  ["Entrances", "650ms, 80ms stagger", "ease-out-expo"],
  ["Scroll reveal", "650ms, 70ms stagger", "ease-out-expo"],
  ["Logo light", "7s per lap", "linear (constant speed)"],
  ["Reduced motion", "fades only", "no movement"],
];

function Card({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="text-h3 font-semibold">{title}</h3>
      <p className="mt-2 text-white/70">{children}</p>
    </div>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const contact = { label: "Get in touch", href: "#contact" };

// header with live (or ?links=sample) contact links. Request-time data, so it
// streams
async function Header({ searchParams }: { searchParams: SearchParams }) {
  const { links } = await searchParams;
  const contactLinks =
    links === "sample" ? sampleLinks : await loadContactLinks();
  return (
    <SiteHeader
      items={navItems}
      contact={contact}
      contactLinks={contactLinks}
    />
  );
}

export default function DesignPreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <Backdrop />
      <Suspense fallback={<SiteHeader items={navItems} contact={contact} />}>
        <Header searchParams={searchParams} />
      </Suspense>

      <main id="main">
        {/* hero, after the Figma mockup */}
        <section>
          <Container className="flex flex-col gap-14 pt-[clamp(2rem,6svh,5rem)] pb-16 lg:min-h-[calc(100svh-var(--header-total))] lg:justify-center lg:gap-16 lg:pb-12">
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
              <div className="max-w-[40rem]">
                <Eyebrow className="animate-enter">
                  Quivery&apos;s Development
                </Eyebrow>
                <h1 className="mt-5 animate-enter text-display font-semibold [--i:1]">
                  The systems behind{" "}
                  <span className="text-gradient">the gameplay.</span>
                </h1>
                <p className="mt-6 max-w-[36rem] animate-enter text-lead text-white/75 [--i:2]">
                  Hi, I&apos;m Quivery. I design the data layers, architecture
                  and tooling that live Roblox games depend on, backed by 6
                  years of Luau.
                </p>
                <div className="mt-9 flex animate-enter flex-wrap gap-3 [--i:3]">
                  <ButtonLink href="#contact" size="lg">
                    Get in touch
                    <ArrowRight data-icon="end" />
                  </ButtonLink>
                  <ButtonLink href="#motion" size="lg" variant="secondary">
                    See projects
                  </ButtonLink>
                </div>
              </div>
              <HeroMark className="mx-auto w-[min(100%,26rem,62svh)] lg:w-full lg:max-w-[34rem] lg:justify-self-end" />
            </div>

            <StatList>
              <Stat value="6" label="Years of Luau" />
              <Stat value="10+" label="Sample stat" />
              <Stat value="15" label="Sample stat" />
              <Stat value="4" label="Sample stat" />
            </StatList>
          </Container>
        </section>

        {/* reference sheet */}
        <Container className="space-y-section py-section">
          <SectionHeading
            eyebrow="Dev only"
            title="Design system"
            description="Tokens and components from apps/web/app/globals.css and apps/web/components. Resize the window, zoom, and switch on reduced motion to check every state."
          />

          <section id="tokens" className="space-y-8">
            <h2 className="text-h2 font-semibold">Colour</h2>
            <Reveal
              as="ul"
              stagger
              className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3"
            >
              {swatches.map((swatch) => (
                <li
                  key={swatch.name}
                  className="rounded-xl border border-white/10 p-3"
                >
                  <div
                    className="h-14 rounded-md"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <p className="mt-3 font-semibold">{swatch.name}</p>
                  <p className="text-sm text-white/70">
                    {swatch.hex} · {swatch.note}
                  </p>
                </li>
              ))}
              <li className="rounded-xl border border-white/10 p-3">
                <div className="bg-brand-gradient h-14 rounded-md" />
                <p className="mt-3 font-semibold">bg-brand-gradient</p>
                <p className="text-sm text-white/70">primary buttons</p>
              </li>
            </Reveal>

            <h3 className="text-h3 font-semibold">Radius</h3>
            <ul className="flex flex-wrap gap-4">
              {radii.map((radius) => (
                <li key={radius} className="text-center text-sm text-white/70">
                  <div
                    className={`size-16 border border-white/25 bg-white/5 ${radiusClass[radius]}`}
                  />
                  <p className="mt-2">{radius}</p>
                </li>
              ))}
            </ul>
          </section>

          <section id="type" className="space-y-8">
            <h2 className="text-h2 font-semibold">Type</h2>
            <div className="space-y-6">
              <p className="text-display font-semibold">
                Display <span className="text-gradient">gameplay, jq</span>
              </p>
              <p className="text-h2 font-semibold">Heading 2: Typography</p>
              <p className="text-h3 font-semibold">Heading 3: Project title</p>
              <p className="text-lead text-white/75">
                Lead: introductions and section intros, set for comfortable
                reading at about 65 characters per line.
              </p>
              <p className="max-w-[65ch] text-white/75">
                Body: regular paragraphs. Poppins 400 at 16px with a 1.65 line
                height.
              </p>
              <Eyebrow>Eyebrow label</Eyebrow>
              <p className="text-stat font-medium tabular-nums">10+</p>
            </div>

            <h3 className="text-h3 font-semibold">Stress test</h3>
            <div className="space-y-4 rounded-xl border border-dashed border-white/20 p-5">
              <p className="text-display font-semibold">
                <span className="text-gradient">
                  Datastorereplicationsupervisor gyp
                </span>
              </p>
              <h3 className="text-h2 font-semibold">
                MemoryStoreSortedMapReplicationGuard and a long heading that
                wraps across several lines
              </h3>
              <p className="text-white/75">
                https://github.com/qvyra/geode/blob/main/benchmarks/very-long-path-without-spaces.luau
              </p>
              <ButtonLink href="#type" variant="secondary">
                A deliberately long button label that has to wrap on phones
              </ButtonLink>
            </div>
          </section>

          <section id="buttons" className="space-y-8">
            <h2 className="text-h2 font-semibold">Buttons</h2>
            <div className="space-y-6">
              {sizes.map((size) => (
                <div key={size} className="flex flex-wrap items-center gap-4">
                  <span className="w-8 text-sm text-white/60">{size}</span>
                  <Button size={size}>Primary</Button>
                  <Button size={size} variant="secondary">
                    Secondary
                  </Button>
                  <Button size={size}>
                    Continue
                    <ArrowRight data-icon="end" />
                  </Button>
                  <Button size={size} variant="secondary">
                    <Mail />
                    Email
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-4">
                <span className="w-8 text-sm text-white/60">off</span>
                <Button disabled>Disabled</Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
              </div>
            </div>

            <h3 className="text-h3 font-semibold">Navigation links</h3>
            <nav aria-label="Sample" className="-ml-3 flex flex-wrap">
              <a href="#buttons" className="nav-link">
                Link
              </a>
              <a href="#buttons" className="nav-link" aria-current="true">
                Current
              </a>
            </nav>
          </section>

          <section id="motion" className="space-y-8">
            <SectionHeading
              title="Motion"
              description="Only transform and opacity animate. These cards reveal one after another as they scroll into view."
            />
            <Reveal
              as="ul"
              stagger
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {motion.map(([what, timing, easing]) => (
                <li key={what}>
                  <Card title={what}>{`${timing} · ${easing}`}</Card>
                </li>
              ))}
            </Reveal>
          </section>

          <section id="contact" className="space-y-6">
            <SectionHeading eyebrow="Anchor target" title="Contact" />
            <p className="text-white/70">
              The header&apos;s Contact button scrolls here; the heading lands
              below the sticky header.
            </p>
          </section>
        </Container>
      </main>
    </>
  );
}
