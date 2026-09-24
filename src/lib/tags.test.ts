import { describe, expect, it } from "vitest";

import { bySlug, parseTags, tagHref } from "./tags";

describe("parseTags", () => {
  it("splits one field on commas", () => {
    expect(parseTags(["weeknight, chicken"])).toEqual(["weeknight", "chicken"]);
  });

  it("reads every field submitted, in order", () => {
    expect(parseTags(["weeknight", "chicken, rice"])).toEqual(["weeknight", "chicken", "rice"]);
  });

  it("keeps the name as it was typed", () => {
    expect(parseTags(["Weeknight Dinner"])).toEqual(["Weeknight Dinner"]);
  });

  it("drops a repeat whatever its case, keeping the first name typed", () => {
    expect(parseTags(["Weeknight, weeknight, WEEKNIGHT"])).toEqual(["Weeknight"]);
  });

  // "week night" slugifies to "week-night", which is a different tag from
  // "weeknight". Only what `slugify` folds together is one tag.
  it("treats a name with a space in it as its own tag", () => {
    expect(parseTags(["weeknight, week night"])).toEqual(["weeknight", "week night"]);
  });

  it("drops a blank between two commas", () => {
    expect(parseTags([" chicken ,, rice "])).toEqual(["chicken", "rice"]);
  });

  it("drops a name that would leave no slug at all", () => {
    expect(parseTags(["!!!, chicken"])).toEqual(["chicken"]);
  });

  it("gives nothing for an empty field", () => {
    expect(parseTags([""])).toEqual([]);
    expect(parseTags([])).toEqual([]);
  });
});

describe("bySlug", () => {
  // Sorting by name would put "Weeknight" before "apple" on a C collation and
  // after it on an en_US one. The slug is lowercase, so it sorts the same
  // wherever it runs.
  it("orders by slug rather than by the name's case", () => {
    const tags = [{ slug: "weeknight" }, { slug: "apple" }];

    expect([...tags].sort(bySlug)).toEqual([{ slug: "apple" }, { slug: "weeknight" }]);
  });

  it("leaves two of the same slug alone", () => {
    expect(bySlug({ slug: "apple" }, { slug: "apple" })).toBe(0);
  });
});

describe("tagHref", () => {
  it("gives the plain list when there is no tag and no search", () => {
    expect(tagHref(null)).toBe("/");
  });

  it("carries the tag", () => {
    expect(tagHref("weeknight")).toBe("/?tag=weeknight");
  });

  it("carries a search alongside the tag", () => {
    expect(tagHref("weeknight", "chicken")).toBe("/?q=chicken&tag=weeknight");
  });

  it("keeps the search when the tag is cleared", () => {
    expect(tagHref(null, "chicken")).toBe("/?q=chicken");
  });
});
