"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

/** Copies `text` to the clipboard, with a brief confirmation */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => setCopied(true),
          () => {},
        )
      }
      className="inline-flex min-h-9 items-center gap-1.5 rounded-sm px-2 text-xs font-medium text-white/70 hover:text-white pointer-coarse:min-h-11"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
