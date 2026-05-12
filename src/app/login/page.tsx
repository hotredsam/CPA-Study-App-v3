import { DEFAULT_ALLOWED_EMAIL, isGoogleAuthConfigured } from "@/lib/auth/google";
import { LoginClient } from "./LoginClient";

export const metadata = { title: "Sign in - CPA Study Servant" };

type LoginSearchParams = Record<string, string | string[] | undefined>;

function singleParam(searchParams: LoginSearchParams, key: string): string | null {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeNextPath(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<LoginSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <LoginClient
      configured={isGoogleAuthConfigured()}
      allowedEmail={DEFAULT_ALLOWED_EMAIL}
      nextPath={safeNextPath(singleParam(resolvedSearchParams, "next"))}
      providerError={singleParam(resolvedSearchParams, "error")}
      setupMissing={singleParam(resolvedSearchParams, "setup") === "missing"}
    />
  );
}
