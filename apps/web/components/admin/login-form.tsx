"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    // the API sleeps on the free plan and takes about 35 seconds to wake
    const timer = setTimeout(() => setSlow(true), 3_000);
    try {
      const response = await fetch("/admin/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      if (response.ok) {
        router.replace("/admin");
        return;
      }
      const json = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(json?.message ?? "Signing in failed. Try again.");
    } catch {
      setError("You seem to be offline.");
    } finally {
      clearTimeout(timer);
      setSlow(false);
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      aria-labelledby="login-title"
      className="w-full max-w-sm space-y-5 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/10 ring-inset sm:p-8"
    >
      <h1 id="login-title" className="text-h3 font-semibold">
        Sign in
      </h1>
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field-input"
        />
      </div>
      <p
        ref={errorRef}
        tabIndex={-1}
        role="alert"
        className={error ? "text-sm text-(--color-error)" : undefined}
      >
        {error}
      </p>
      <button
        type="submit"
        className="btn btn-primary btn-md w-full"
        aria-disabled={busy || undefined}
      >
        {busy && (
          <LoaderCircle
            className="motion-safe:animate-spin"
            aria-hidden="true"
          />
        )}
        {busy ? "Signing in" : "Sign in"}
      </button>
      <p role="status" className="text-sm text-white/60">
        {slow ? "Waking the server, this can take up to a minute" : ""}
      </p>
    </form>
  );
}
