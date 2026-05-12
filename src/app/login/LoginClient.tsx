"use client";

import { useState } from "react";

function messageFromError(value: unknown): string {
  if (value instanceof Error) return value.message;
  return "Login failed. Please try again.";
}

export function LoginClient({
  configured,
  allowedEmail,
  nextPath,
  providerError,
  setupMissing,
}: {
  configured: boolean;
  allowedEmail: string;
  nextPath: string;
  providerError: string | null;
  setupMissing: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const visibleError =
    error ??
    (providerError
      ? `That Google account is not allowed. Sign in with ${allowedEmail}.`
      : null);

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      window.location.assign(`/api/auth/google?next=${encodeURIComponent(nextPath)}`);
    } catch (err) {
      setError(messageFromError(err));
      setSubmitting(false);
      return;
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

        <div className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
          {(!configured || setupMissing) && (
            <div className="mb-4 rounded border border-[color:var(--bad-border)] bg-[color:var(--bad-soft)] px-3 py-2 text-sm text-[color:var(--bad)]">
              Google sign-in is not configured yet. Set the Google auth environment variables before deploying.
            </div>
          )}

          <button
            type="button"
            disabled={!configured || submitting}
            onClick={handleGoogleSignIn}
            className="flex h-11 w-full items-center justify-center rounded-[4px] bg-[color:var(--accent)] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Opening Google..." : "Continue with Google"}
          </button>

          <p className="mt-3 text-xs leading-relaxed text-[color:var(--ink-faint)]">
            Access is restricted to {allowedEmail}.
          </p>

          {visibleError && (
            <p className="mt-3 text-sm text-[color:var(--bad)]" role="alert">
              {visibleError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
