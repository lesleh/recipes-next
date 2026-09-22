import { describe, expect, it } from "vitest";

import { ingredientAmount, instructionSteps, pluralize, totalTimeMinutes, truncate } from "./format";

describe("ingredientAmount", () => {
  it("joins the quantity and the unit", () => {
    expect(ingredientAmount({ quantity: "200", unit: "g" })).toBe("200 g");
  });

  it("gives whichever part is filled in", () => {
    expect(ingredientAmount({ quantity: "2", unit: null })).toBe("2");
    expect(ingredientAmount({ quantity: null, unit: "pinch" })).toBe("pinch");
  });

  it("gives an empty string when neither part is filled in", () => {
    expect(ingredientAmount({ quantity: null, unit: null })).toBe("");
    expect(ingredientAmount({ quantity: "  ", unit: "" })).toBe("");
  });

  it("trims each part", () => {
    expect(ingredientAmount({ quantity: " 200 ", unit: " g " })).toBe("200 g");
  });
});

describe("instructionSteps", () => {
  it("gives one step per line", () => {
    expect(instructionSteps("Boil the water\nAdd the pasta")).toEqual([
      "Boil the water",
      "Add the pasta",
    ]);
  });

  it("reads Windows line endings", () => {
    expect(instructionSteps("Boil the water\r\nAdd the pasta")).toEqual([
      "Boil the water",
      "Add the pasta",
    ]);
  });

  it("drops blank lines and trims the rest", () => {
    expect(instructionSteps("  Boil  \n\n\n  Serve  ")).toEqual(["Boil", "Serve"]);
  });

  it("gives no steps for a recipe with no method", () => {
    expect(instructionSteps(null)).toEqual([]);
    expect(instructionSteps("")).toEqual([]);
  });
});

describe("totalTimeMinutes", () => {
  it("adds the two times", () => {
    expect(totalTimeMinutes({ prepTimeMinutes: 10, cookTimeMinutes: 25 })).toBe(35);
  });

  it("counts a missing time as zero when the other is given", () => {
    expect(totalTimeMinutes({ prepTimeMinutes: 10, cookTimeMinutes: null })).toBe(10);
    expect(totalTimeMinutes({ prepTimeMinutes: null, cookTimeMinutes: 25 })).toBe(25);
  });

  it("gives null when neither time is given", () => {
    expect(totalTimeMinutes({ prepTimeMinutes: null, cookTimeMinutes: null })).toBeNull();
  });
});

describe("pluralize", () => {
  it("uses the singular for one", () => {
    expect(pluralize(1, "serving")).toBe("1 serving");
  });

  it("uses the plural for anything else", () => {
    expect(pluralize(0, "serving")).toBe("0 servings");
    expect(pluralize(4, "serving")).toBe("4 servings");
  });

  it("takes an irregular plural", () => {
    expect(pluralize(2, "loaf", "loaves")).toBe("2 loaves");
  });
});

describe("truncate", () => {
  it("leaves text at or under the length alone", () => {
    expect(truncate("Short", 10)).toBe("Short");
    expect(truncate("Exactly10!", 10)).toBe("Exactly10!");
  });

  it("cuts longer text and marks it, keeping the result within the length", () => {
    expect(truncate("A longer description", 10)).toBe("A longe...");
    expect(truncate("A longer description", 10)).toHaveLength(10);
  });

  it("does not leave a space before the mark", () => {
    expect(truncate("Bread and butter", 9)).toBe("Bread...");
  });
});
