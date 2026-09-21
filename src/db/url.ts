// pg currently treats these as verify-full, but pg 9 will give them libpq
// semantics, which skip certificate and hostname checks. Pinning verify-full
// keeps the behaviour we have rather than quietly weakening it on upgrade.
const UNVERIFIED_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function withVerifiedTls(url: string) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (UNVERIFIED_SSL_MODES.has(parsed.searchParams.get("sslmode") ?? "")) {
    parsed.searchParams.set("sslmode", "verify-full");
  }

  return parsed.toString();
}

export function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }

  return withVerifiedTls(url);
}
