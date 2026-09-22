import { afterEach, describe, expect, it, vi } from "vitest";

import { siteUrl } from "./site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("builds an https address from the Vercel domain, which carries no scheme", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "recipes.lesleh.co.uk");

    expect(siteUrl().toString()).toBe("https://recipes.lesleh.co.uk/");
  });

  it("falls back to the local development address", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");

    expect(siteUrl().toString()).toBe("http://localhost:3000/");
  });
});
