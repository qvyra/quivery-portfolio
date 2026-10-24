// Security headers for every response, set by next.config.ts. Pages are
// prerendered, so everything here is static: no per-request nonces

type Header = { key: string; value: string };

// the embed facades load these only after a click
const embedOrigins = [
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
  "https://streamable.com",
];

type Options = {
  /** Where uploaded media is served from, if it's in object storage */
  mediaOrigin: string | null;
  /** Whether the site is served over HTTPS (not a local next start) */
  https: boolean;
  /** next dev, which needs eval and its websocket */
  dev: boolean;
};

function contentSecurityPolicy(admin: boolean, options: Options): string {
  const media = options.mediaOrigin ? [options.mediaOrigin] : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next writes each page's data into inline scripts that change with the
    // content, so they can't be hashed ahead of time, and a nonce would make
    // every page render on request. No other script origin is allowed, React
    // escapes all content and markdown never renders raw HTML
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(options.dev ? ["'unsafe-eval'"] : []),
    ],
    // style attributes, from React and the image component
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://i.ytimg.com", ...media],
    "media-src": ["'self'", "blob:", ...media],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      // uploads go from the browser straight to Vercel Blob
      ...(admin ? ["https://vercel.com/api/blob/"] : []),
      ...(options.dev ? ["ws:", "wss:"] : []),
    ],
    // the admin frames its own preview pages
    "frame-src": [...(admin ? ["'self'"] : []), ...embedOrigins],
    "frame-ancestors": [admin ? "'self'" : "'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    ...(options.https && { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(" "))
    .join("; ");
}

/** next.config.ts headers(): shared ones everywhere, a CSP per area */
export function securityHeaders(options: Options) {
  const shared: Header[] = [
    // browsers already ship all of .dev as HTTPS-only, so preload changes
    // nothing on quivery.dev and keeps the list's terms if the domain moves
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // nothing here uses these. Fullscreen, autoplay and the rest stay
    // available for the video embeds
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
  return [
    { source: "/:path*", headers: shared },
    {
      source: "/((?!admin).*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: contentSecurityPolicy(false, options),
        },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    },
    {
      source: "/admin/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: contentSecurityPolicy(true, options),
        },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ],
    },
  ];
}
