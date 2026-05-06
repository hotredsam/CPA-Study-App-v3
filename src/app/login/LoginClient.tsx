"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function messageFromError(value: unknown): string {
  if (value instanceof Error) return value.message;
  return "Login failed. Please try again.";
}

export function LoginClient({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? "Email or password is incorrect.");
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell min-h-dvh bg-[color:var(--canvas)] px-4 py-10 text-[color:var(--ink)] sm:px-6">
      <main className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[440px] flex-col justify-center">
        <div className="mb-8">
          <p className="eyebrow mb-2">CPA Study Servant</p>
          <h1 className="text-3xl font-semibold leading-tight">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-dim)]">
            Access your recordings, textbooks, flashcards, and study progress.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm"
        >
          {!configured && (
            <div className="mb-4 rounded border border-[color:var(--bad-border)] bg-[color:var(--bad-soft)] px-3 py-2 text-sm text-[color:var(--bad)]">
              Login is not configured yet. Set the auth environment variables before deploying.
            </div>
          )}

          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="mt-1 h-11 w-full rounded-[4px] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-base outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-faint)]"
            required
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-1 h-11 w-full rounded-[4px] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-base outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-faint)]"
            required
          />

          {error && (
            <p className="mt-3 text-sm text-[color:var(--bad)]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!configured || submitting}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-[4px] bg-[color:var(--accent)] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
