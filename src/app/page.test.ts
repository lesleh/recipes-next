import { describe, expect, it, vi } from "vitest";

import { generateMetadata } from "./page";

// The page imports the recipe queries, which open a database pool as they
// load. The metadata never reads a recipe, so the queries are stood down.
vi.mock("@/lib/recipes", () => ({ listRecipes: async () => [] }));

function props(q?: string) {
  return { searchParams: Promise.resolve(q === undefined ? {} : { q }) };
}

describe("generateMetadata", () => {
  it("points the recipe list at its own address", async () => {
    expect(await generateMetadata(props())).toEqual({ alternates: { canonical: "/" } });
  });

  it("treats a search of only spaces as the plain recipe list", async () => {
    expect(await generateMetadata(props("   "))).toEqual({ alternates: { canonical: "/" } });
  });

  it("keeps a search out of the index, and lets a crawler follow it", async () => {
    expect(await generateMetadata(props("chicken"))).toEqual({
      title: "Search: chicken",
      robots: { index: false, follow: true },
    });
  });

  it("leaves a search with no canonical, which would contradict the noindex", async () => {
    expect(await generateMetadata(props("chicken"))).not.toHaveProperty("alternates");
  });
});
