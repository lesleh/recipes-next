import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "./robots";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots", () => {
  it("names the sitemap at the site's own address", () => {
    vi.stubEnv("SITE_URL", "https://recipes.example");

    expect(robots().sitemap).toBe("https://recipes.example/sitemap.xml");
  });

  it("refuses the two pages that need the write password", () => {
    const rules = robots().rules;

    expect(Array.isArray(rules) ? rules[0].disallow : rules.disallow).toEqual([
      "/recipes/new",
      "/recipes/*/edit",
    ]);
  });

  it("allows everything else", () => {
    const rules = robots().rules;

    expect(Array.isArray(rules) ? rules[0].allow : rules.allow).toBe("/");
  });
});
