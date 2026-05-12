export const DEFAULT_ALLOWED_EMAIL = "hotredsam@gmail.com";

export function getAllowedAuthEmails(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env["AUTH_ALLOWED_EMAILS"]?.trim() || DEFAULT_ALLOWED_EMAIL;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAuthEmail(email: string | null | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!email) return false;
  return getAllowedAuthEmails(env).includes(email.trim().toLowerCase());
}

export function isGoogleAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env["AUTH_SECRET"] && env["AUTH_GOOGLE_ID"] && env["AUTH_GOOGLE_SECRET"]);
}

export function shouldRequireAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  const production = env["VERCEL"] === "1" || env["NODE_ENV"] === "production";
  const localProductionSmokeBypass =
    production &&
    env["VERCEL"] !== "1" &&
    env["AUTH_BYPASS"] === "true" &&
    env["ALLOW_LOCAL_PROD_AUTH_BYPASS"] === "true";
  if ((!production || localProductionSmokeBypass) && env["AUTH_BYPASS"] === "true") return false;
  if (env["AUTH_REQUIRED"] === "true") return true;
  return production;
}
