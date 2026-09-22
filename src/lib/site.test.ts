import { afterEach, describe, expect, it, vi } from "vitest";

import { absoluteUrl, siteUrl } from "./site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("builds an https address from the Vercel domain, which carries no scheme", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "recipes.lesleh.co.uk");

    expect(siteUrl().toString()).toBe("https://recipes.lesleh.co.uk/");
  });

  it("prefers SITE_URL, which is how a self-hosted run says where it answers", () => {
    vi.stubEnv("SITE_URL", "https://recipes.example");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "recipes.lesleh.co.uk");

    expect(siteUrl().toString()).toBe("https://recipes.example/");
  });

  it("falls back to the local development address", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");

    expect(siteUrl().toString()).toBe("http://localhost:3000/");
  });
});

describe("absoluteUrl", () => {
  it("puts the site origin in front of a path", () => {
    vi.stubEnv("SITE_URL", "https://recipes.example");

    expect(absoluteUrl("/uploads/cake.jpg")).toBe("https://recipes.example/uploads/cake.jpg");
  });

  it("leaves an address that already carries an origin alone", () => {
    vi.stubEnv("SITE_URL", "https://recipes.example");

    expect(absoluteUrl("https://blob.example/cake.jpg")).toBe("https://blob.example/cake.jpg");
  });
});
