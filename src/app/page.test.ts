import { describe, expect, it, vi } from "vitest";

import { generateMetadata } from "./page";

// The page imports the recipe queries, which open a database pool as they
// load. The metadata never reads a recipe, so the queries are stood down.
vi.mock("@/lib/recipes", () => ({ listRecipes: async () => [], listTags: async () => [] }));

function props(params: { q?: string; tag?: string } = {}) {
  return { searchParams: Promise.resolve(params) };
}

describe("generateMetadata", () => {
  it("points the recipe list at its own address", async () => {
    expect(await generateMetadata(props())).toEqual({ alternates: { canonical: "/" } });
  });

  it("treats a search of only spaces as the plain recipe list", async () => {
    expect(await generateMetadata(props({ q: "   " }))).toEqual({ alternates: { canonical: "/" } });
  });

  it("keeps a search out of the index, and lets a crawler follow it", async () => {
    expect(await generateMetadata(props({ q: "chicken" }))).toEqual({
      title: "Search: chicken",
      robots: { index: false, follow: true },
    });
  });

  it("leaves a search with no canonical, which would contradict the noindex", async () => {
    expect(await generateMetadata(props({ q: "chicken" }))).not.toHaveProperty("alternates");
  });

  it("keeps a chosen tag out of the index too, because it filters the same list", async () => {
    expect(await generateMetadata(props({ tag: "weeknight" }))).toEqual({
      title: "Tag: weeknight",
      robots: { index: false, follow: true },
    });
  });

  it("names both when a search runs inside a tag", async () => {
    expect(await generateMetadata(props({ q: "chicken", tag: "weeknight" }))).toEqual({
      title: "Search: chicken in weeknight",
      robots: { index: false, follow: true },
    });
  });

  it("treats a tag of only spaces as the plain recipe list", async () => {
    expect(await generateMetadata(props({ tag: "  " }))).toEqual({
      alternates: { canonical: "/" },
    });
  });
});
