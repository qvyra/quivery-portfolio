"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { adminFetch, type DeployOutcome } from "./api";
import { collections } from "./fields";

// ── Unsaved changes ─────────────────────────────────────────────────────────

let dirty = false;

/** Editors say when they hold changes that aren't saved yet */
export function useUnsavedGuard(isDirty: boolean) {
  useEffect(() => {
    dirty = isDirty;
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      dirty = false;
    };
  }, [isDirty]);
}

/** Asks before leaving an editor with unsaved changes */
export function confirmLeave(): boolean {
  return (
    !dirty || window.confirm("You have unsaved changes. Leave without saving?")
  );
}

// ── Notices ─────────────────────────────────────────────────────────────────

type Notice = { id: number; text: string; tone: "ok" | "error" };
const NoticeContext = createContext<
  (text: string, tone?: Notice["tone"]) => void
>(() => {});

export const useNotice = () => useContext(NoticeContext);

/** What a deploy outcome means for the person who caused it */
export function deployNotice(deploy: DeployOutcome | undefined): string | null {
  switch (deploy) {
    case "started":
      return "The project URLs changed, so a deploy started. The site updates in about 5 minutes.";
    case "not-configured":
      return "The project URLs changed: run the Deploy workflow on GitHub to update them (no deploy token is set).";
    case "failed":
      return "The project URLs changed, but starting the deploy failed. Run the Deploy workflow on GitHub.";
    default:
      return null;
  }
}

// ── Shell ───────────────────────────────────────────────────────────────────

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/profile", label: "Profile" },
  ...Object.entries(collections).map(([key, config]) => ({
    href: `/admin/content/${key}`,
    label: config.title,
  })),
  { href: "/admin/media", label: "Media" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const next = useRef(0);

  const notify = useCallback((text: string, tone: Notice["tone"] = "ok") => {
    const id = ++next.current;
    setNotices((all) => [...all, { id, text, tone }]);
    setTimeout(
      () => setNotices((all) => all.filter((n) => n.id !== id)),
      tone === "error" ? 10_000 : 6_000,
    );
  }, []);

  useEffect(() => {
    adminFetch<{ username: string }>("/auth/session")
      .then((session) => setUsername(session.username))
      .catch(() => {});
  }, []);
  useEffect(() => {
    adminFetch<{ counts: { NEW: number } }>("/messages")
      .then((inbox) => setUnread(inbox.counts.NEW))
      .catch(() => {});
  }, [pathname]);

  async function signOut() {
    if (!confirmLeave()) return;
    await fetch("/admin/api/auth/logout", { method: "POST" }).catch(() => {});
    // a full load, like an expired session in api.ts. A client navigation
    // would rerun the panel's effects first, against a session that's gone
    window.location.replace("/admin/login");
  }

  return (
    <NoticeContext.Provider value={notify}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="border-b border-white/10 bg-ink-raised/60 p-4 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
          <p className="px-3 text-sm font-semibold tracking-wide text-white/60 uppercase">
            Quivery admin
          </p>
          <nav aria-label="Admin" className="mt-4">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
              {nav.map((item) => {
                const current =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      onClick={(e) => {
                        if (!confirmLeave()) e.preventDefault();
                      }}
                      className={`flex min-h-10 items-center justify-between gap-3 rounded-md px-3 text-sm whitespace-nowrap ${current ? "bg-white/[0.08] font-semibold text-white" : "text-white/75 hover:bg-white/[0.04] hover:text-white"}`}
                    >
                      {item.label}
                      {item.href === "/admin/inbox" && unread > 0 && (
                        <span className="rounded-full bg-(--color-rose) px-2 text-xs font-semibold text-white">
                          {unread}
                          <span className="sr-only"> unread</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-6 hidden px-3 lg:block">
            {username && (
              <p className="text-sm text-white/55">Signed in as {username}</p>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm text-white/75 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </aside>
        {/* labelled, so it stays distinct from the site's own main inside
            the preview frame */}
        <main id="main" aria-label="Admin" className="min-w-0 p-4 sm:p-8">
          {children}
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-10 inline-flex min-h-10 items-center gap-2 text-sm text-white/75 lg:hidden"
          >
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </main>
      </div>
      <div
        aria-live="polite"
        className="fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2"
      >
        {notices.map((notice) => (
          <p
            key={notice.id}
            role={notice.tone === "error" ? "alert" : undefined}
            className={`rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ring-inset ${notice.tone === "error" ? "bg-[#2a0619] ring-(--color-error)/50" : "bg-ink-raised ring-white/15"}`}
          >
            {notice.text}
          </p>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}
