import { describe, expect, it } from "vitest";

import { RESERVED_SLUGS, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Chocolate Cake")).toBe("chocolate-cake");
  });

  it("reduces accented letters to their base letter", () => {
    expect(slugify("Crème Brûlée")).toBe("creme-brulee");
    expect(slugify("Jalapeño Poppers")).toBe("jalapeno-poppers");
  });

  it("reduces a precomposed and a decomposed letter to the same slug", () => {
    expect(slugify("Crème")).toBe(slugify("Crème"));
  });

  it("keeps letters from other scripts", () => {
    expect(slugify("Ramen ラーメン")).toBe("ramen-ラーメン");
    expect(slugify("Борщ")).toBe("борщ");
  });

  it("keeps numbers", () => {
    expect(slugify("15 Minute Pasta")).toBe("15-minute-pasta");
  });

  it("turns each run of other characters into one hyphen", () => {
    expect(slugify("Fish & Chips")).toBe("fish-chips");
    expect(slugify("Mac 'n' Cheese!!!")).toBe("mac-n-cheese");
    expect(slugify("Soup    for   one")).toBe("soup-for-one");
  });

  it("drops hyphens from the ends", () => {
    expect(slugify("  Bread  ")).toBe("bread");
    expect(slugify("--Cake--")).toBe("cake");
  });

  it("gives an empty slug when the title holds no letters or numbers", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("gives the same slug for titles that differ only in case or punctuation", () => {
    expect(slugify("Chocolate cake")).toBe(slugify("Chocolate Cake!"));
  });
});

describe("RESERVED_SLUGS", () => {
  it("holds the new recipe page, which is a real address under /recipes", () => {
    expect(RESERVED_SLUGS.has("new")).toBe(true);
  });
});
