import { afterEach, describe, expect, it, vi } from "vitest";

import { requireDatabaseUrl, withVerifiedTls } from "./url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("withVerifiedTls", () => {
  // These three behave as verify-full in pg today, but are due to take the
  // weaker libpq meaning, which skips certificate and hostname checks.
  it.each(["prefer", "require", "verify-ca"])("rewrites sslmode=%s to verify-full", (mode) => {
    const url = withVerifiedTls(`postgresql://user:pw@host/db?sslmode=${mode}`);

    expect(new URL(url).searchParams.get("sslmode")).toBe("verify-full");
  });

  it("leaves verify-full alone", () => {
    const url = "postgresql://user:pw@host/db?sslmode=verify-full";

    expect(new URL(withVerifiedTls(url)).searchParams.get("sslmode")).toBe("verify-full");
  });

  it("leaves disable alone, because that is a deliberate choice", () => {
    const url = "postgresql://user:pw@host/db?sslmode=disable";

    expect(new URL(withVerifiedTls(url)).searchParams.get("sslmode")).toBe("disable");
  });

  it("adds nothing when no sslmode is given", () => {
    const url = "postgresql://user:pw@host/db";

    expect(new URL(withVerifiedTls(url)).searchParams.get("sslmode")).toBeNull();
  });

  it("keeps the other parts of the address", () => {
    const url = new URL(withVerifiedTls("postgresql://user:pw@host:5432/db?sslmode=require"));

    expect(url.username).toBe("user");
    expect(url.hostname).toBe("host");
    expect(url.port).toBe("5432");
    expect(url.pathname).toBe("/db");
  });

  it("gives back anything it cannot read as an address", () => {
    expect(withVerifiedTls("not a url")).toBe("not a url");
  });
});

describe("requireDatabaseUrl", () => {
  it("gives the connection string with TLS pinned", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pw@host/db?sslmode=require");

    expect(requireDatabaseUrl()).toContain("sslmode=verify-full");
  });

  it("says what to do when the variable is missing", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(() => requireDatabaseUrl()).toThrow("DATABASE_URL is not set");
  });
});
