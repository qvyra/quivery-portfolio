"use client";

import type { IconRef } from "@repo/shared";
import { ImagePlus, Search, Smile, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { IconSvg } from "@/components/ui/site-icon";
import {
  iconLibrary,
  libraryIcon,
  type LibraryIcon,
} from "@/lib/icons/library";
import { FieldError } from "./form";
import {
  fileName,
  MediaPicker,
  MediaThumb,
  useMediaLibrary,
  type AdminMedia,
} from "./media";

type Tab = "icons" | "logos" | "upload";
const tabs: { id: Tab; label: string }[] = [
  { id: "icons", label: "Icons" },
  { id: "logos", label: "Logos" },
  { id: "upload", label: "Upload" },
];
const logoGroups = [
  { group: "tech", label: "Languages and tools" },
  { group: "roblox", label: "Roblox" },
] as const;

const tabOf = (icon: LibraryIcon): Tab =>
  icon.group === "icons" ? "icons" : "logos";

/** Whether an icon matches every word typed, by label, key or keyword */
function matches(icon: LibraryIcon, words: string[]) {
  const haystack = [icon.label, icon.key, ...icon.keywords]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** The name an icon goes by in the admin, for a field's summary */
export function iconName(
  value: IconRef | null | undefined,
  media: AdminMedia[] | null,
): string | null {
  if (!value) return null;
  if (value.kind === "icon") {
    return libraryIcon(value.key)?.label ?? `Unknown icon (${value.key})`;
  }
  const file = media?.find((m) => m.id === value.id);
  return file ? `Upload: ${file.alt || fileName(file)}` : "Upload";
}

/** A picked icon, white on a dark tile, as the site shows it */
export function IconPreview({
  value,
  fallback,
  className = "size-11",
}: {
  value: IconRef | null | undefined;
  /** A library key shown dimmed when nothing is picked */
  fallback?: string | null;
  className?: string;
}) {
  const media = useMediaLibrary();
  const tile = `${className} grid shrink-0 place-items-center rounded-md bg-ink ring-1 ring-white/15 ring-inset`;
  if (value?.kind === "media") {
    const file = media?.find((m) => m.id === value.id);
    return file ? (
      <MediaThumb
        media={file}
        className={`${className} object-contain p-1.5`}
      />
    ) : (
      <span className={tile} />
    );
  }
  const icon = libraryIcon(value?.kind === "icon" ? value.key : fallback);
  return (
    <span className={tile}>
      {icon && (
        <IconSvg
          icon={icon}
          className={`size-5 ${value ? "text-white" : "text-white/40"}`}
        />
      )}
    </span>
  );
}

/**
 * Picks a built-in icon (Icons and Logos tabs, searchable) or an uploaded
 * image (Upload, through the Media picker). Clearing it goes back to the
 * default, which `clearLabel` names
 */
export function IconPicker({
  open,
  value,
  clearLabel,
  onPick,
  onClose,
}: {
  open: boolean;
  value: IconRef | null | undefined;
  clearLabel: string;
  onPick: (value: IconRef | null) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    icons: null,
    logos: null,
    upload: null,
  });
  const id = useId();
  const current = value?.kind === "icon" ? libraryIcon(value.key) : null;
  const [tab, setTab] = useState<Tab>("icons");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const media = useMediaLibrary();

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) {
      // opens on the tab holding the current pick
      setTab(
        value?.kind === "media" ? "upload" : current ? tabOf(current) : "icons",
      );
      setQuery("");
      element.showModal();
      requestAnimationFrame(() => search.current?.focus());
    }
    if (!open && element?.open) element.close();
  }, [open, value, current]);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = useMemo(
    () => iconLibrary.filter((icon) => matches(icon, words)),
    // words is derived from query
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query],
  );
  const inTab = (t: Tab) => found.filter((icon) => tabOf(icon) === t);
  const other: Tab = tab === "icons" ? "logos" : "icons";

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((t) => t.id === tab);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + tabs.length - 1) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setTab(tabs[next]!.id);
    tabRefs.current[tabs[next]!.id]?.focus();
  }

  const grid = (icons: LibraryIcon[]) => (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
      {icons.map((icon) => {
        const selected = current?.key === icon.key;
        return (
          <li key={icon.key}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onPick({ kind: "icon", key: icon.key })}
              className={`flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg bg-ink p-2 text-center ring-1 ring-inset transition-shadow hover:ring-white/40 ${
                selected ? "ring-2 ring-orchid" : "ring-white/10"
              }`}
            >
              <IconSvg icon={icon} className="size-7 text-white" />
              <span className="text-xs leading-tight text-white/75">
                {icon.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const results = (t: Tab) => {
    const icons = inTab(t);
    if (icons.length === 0) {
      const elsewhere = inTab(other).length;
      return (
        <p className="py-8 text-center text-white/60">
          No {t === "icons" ? "icons" : "logos"} match “{query.trim()}”.
          {elsewhere > 0 && (
            <>
              {" "}
              <button
                type="button"
                className="font-medium text-white underline underline-offset-4"
                onClick={() => setTab(other)}
              >
                {elsewhere} in {other === "icons" ? "Icons" : "Logos"}
              </button>
            </>
          )}
        </p>
      );
    }
    if (t === "icons") return grid(icons);
    return (
      <div className="space-y-5">
        {logoGroups.map(({ group, label }) => {
          const list = icons.filter((icon) => icon.group === group);
          return (
            list.length > 0 && (
              <section key={group} aria-label={label}>
                <h3 className="mb-2 text-eyebrow font-semibold text-white/55 uppercase">
                  {label}
                </h3>
                {grid(list)}
              </section>
            )
          );
        })}
      </div>
    );
  };

  const uploaded =
    value?.kind === "media" ? media?.find((m) => m.id === value.id) : null;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      className="m-auto flex max-h-[min(44rem,calc(100dvh-2rem))] w-[min(52rem,calc(100vw-2rem))] flex-col rounded-xl bg-ink-raised p-0 text-white ring-1 ring-white/15 backdrop:bg-black/70 [&:not([open])]:hidden"
    >
      <div className="space-y-4 border-b border-white/10 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id={`${id}-title`} className="text-h3 font-semibold">
            Choose an icon
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-md hover:bg-white/[0.06]"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div
          role="tablist"
          aria-label="Icon source"
          className="flex gap-1 rounded-lg bg-ink p-1 ring-1 ring-white/10 ring-inset"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${id}-panel`}
              tabIndex={tab === t.id ? 0 : -1}
              onKeyDown={onTabKey}
              onClick={() => setTab(t.id)}
              className={`min-h-10 flex-1 rounded-md px-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white/[0.12] text-white"
                  : "text-white/65 hover:text-white"
              }`}
            >
              {t.label}
              {t.id !== "upload" && words.length > 0 && (
                <span className="ml-1.5 text-white/55">
                  {inTab(t.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
        {tab !== "upload" && (
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50"
            />
            <input
              ref={search}
              type="search"
              aria-label="Search icons"
              placeholder="Search, e.g. database, github, rojo"
              className="field-input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"
      >
        {tab === "upload" ? (
          <div className="space-y-4">
            <p className="text-white/75">
              Use your own image from Media. It shows as uploaded, in its own
              colours, at the size a built-in icon takes.
            </p>
            {uploaded && (
              <div className="flex items-center gap-3">
                <MediaThumb
                  media={uploaded}
                  className="size-16 object-contain p-2"
                />
                <span className="text-sm text-white/75">
                  Current: {uploaded.alt || fileName(uploaded)}
                </span>
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setUploading(true)}
            >
              <ImagePlus aria-hidden="true" />
              {uploaded ? "Choose another image" : "Choose an image"}
            </button>
          </div>
        ) : (
          results(tab)
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
        <p className="text-sm text-white/55">
          {value ? `Picked: ${iconName(value, media)}` : `Now: ${clearLabel}`}
        </p>
        {value && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onPick(null)}
          >
            <X aria-hidden="true" /> {clearLabel}
          </button>
        )}
      </div>

      <MediaPicker
        open={uploading}
        accept="IMAGE"
        onClose={() => setUploading(false)}
        onPick={(file) => {
          setUploading(false);
          onPick({ kind: "media", id: file.id });
        }}
      />
    </dialog>
  );
}

/**
 * A form field holding an icon: a built-in one or an upload. `fallback`
 * names what shows with neither
 */
export function IconField({
  id,
  label,
  help,
  error,
  value,
  fallback,
  fallbackLabel,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  value: IconRef | null;
  /** The library key shown when nothing is picked, if any */
  fallback?: string | null;
  /** What shows when nothing is picked, e.g. "No icon" */
  fallbackLabel: string;
  onChange: (value: IconRef | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  const media = useMediaLibrary();
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-error`}
    >
      <p id={`${id}-label`} className="mb-1.5 text-sm font-medium">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <IconPreview value={value} fallback={fallback} />
        <span className="min-w-0 text-sm text-white/75">
          {iconName(value, media) ?? fallbackLabel}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setPicking(true)}
        >
          <Smile aria-hidden="true" /> {value ? "Change" : "Choose"}
        </button>
        {value && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onChange(null)}
          >
            <X aria-hidden="true" /> Remove
          </button>
        )}
      </div>
      {help && <p className="mt-1.5 text-sm text-white/55">{help}</p>}
      <FieldError id={`${id}-error`} error={error} />
      <IconPicker
        open={picking}
        value={value}
        clearLabel={fallbackLabel}
        onClose={() => setPicking(false)}
        onPick={(next) => {
          onChange(next);
          setPicking(false);
        }}
      />
    </div>
  );
}

/** A link's icon, as a tile in its row that opens the picker */
export function LinkIconButton({
  value,
  fallback,
  onChange,
}: {
  value: IconRef | undefined;
  /** The link type's own icon */
  fallback: string;
  onChange: (value: IconRef | undefined) => void;
}) {
  const [picking, setPicking] = useState(false);
  const media = useMediaLibrary();
  const clearLabel = `From the type: ${libraryIcon(fallback)?.label ?? fallback}`;
  return (
    <>
      <button
        type="button"
        aria-label={`Link icon, ${iconName(value, media) ?? clearLabel}. Change`}
        title="Change the icon"
        className="shrink-0 rounded-md hover:brightness-125"
        onClick={() => setPicking(true)}
      >
        <IconPreview value={value} fallback={fallback} />
      </button>
      <IconPicker
        open={picking}
        value={value}
        clearLabel={clearLabel}
        onClose={() => setPicking(false)}
        onPick={(next) => {
          onChange(next ?? undefined);
          setPicking(false);
        }}
      />
    </>
  );
}
