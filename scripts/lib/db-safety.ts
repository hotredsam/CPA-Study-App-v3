export function loadDotEnv(): void {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(".env");
  }
}

export function assertLocalDatabaseUrl(): void {
  const raw = process.env["DATABASE_URL"];
  if (!raw) {
    throw new Error("DATABASE_URL is not set.");
  }

  const url = new URL(raw);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(url.hostname)) {
    throw new Error(
      `Refusing to mutate non-local database host "${url.hostname}". Run this only against local Docker Postgres.`,
    );
  }
}
