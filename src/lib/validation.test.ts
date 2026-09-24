import { describe, expect, it } from "vitest";

import {
  IMAGE_CONTENT_TYPES,
  MAX_IMAGE_BYTES,
  ingredientSchema,
  recipeSchema,
  validateImage,
} from "./validation";
import { MAX_TAG_NAME, MAX_TAGS } from "./tags";

/** A File of a given size, without holding that many bytes in memory. */
function imageFile({ type, size = 1024 }: { type: string; size?: number }) {
  const file = new File(["x"], "photo", { type });
  Object.defineProperty(file, "size", { value: size });

  return file;
}

const valid = {
  title: "Chocolate Cake",
  description: "",
  category: "",
  cuisine: "",
  tags: [],
  servings: "",
  prepTimeMinutes: "",
  cookTimeMinutes: "",
  instructions: "",
  ingredients: [],
};

describe("recipeSchema", () => {
  it("accepts a recipe with only a title", () => {
    const result = recipeSchema.parse(valid);

    expect(result.title).toBe("Chocolate Cake");
  });

  it("trims the title", () => {
    expect(recipeSchema.parse({ ...valid, title: "  Cake  " }).title).toBe("Cake");
  });

  it("refuses a title that is blank or only spaces", () => {
    expect(recipeSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
    expect(recipeSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });

  it("refuses a title over 200 characters", () => {
    expect(recipeSchema.safeParse({ ...valid, title: "a".repeat(201) }).success).toBe(false);
    expect(recipeSchema.safeParse({ ...valid, title: "a".repeat(200) }).success).toBe(true);
  });

  it("turns a blank optional field into null", () => {
    const result = recipeSchema.parse({ ...valid, description: "   ", instructions: "" });

    expect(result.description).toBeNull();
    expect(result.instructions).toBeNull();
  });

  it("reads a number field from the string the form submits", () => {
    const result = recipeSchema.parse({ ...valid, servings: "4", prepTimeMinutes: "15" });

    expect(result.servings).toBe(4);
    expect(result.prepTimeMinutes).toBe(15);
  });

  it("treats a blank number field as not given", () => {
    expect(recipeSchema.parse({ ...valid, servings: "" }).servings).toBeNull();
  });

  it("refuses a number that is zero, negative or fractional", () => {
    for (const servings of ["0", "-1", "1.5"]) {
      expect(recipeSchema.safeParse({ ...valid, servings }).success).toBe(false);
    }
  });

  it("keeps the course and the cuisine as typed", () => {
    const result = recipeSchema.parse({
      ...valid,
      category: " Main course ",
      cuisine: "Italian",
    });

    expect(result).toMatchObject({ category: "Main course", cuisine: "Italian" });
  });

  it("keeps the tags it is given", () => {
    expect(recipeSchema.parse({ ...valid, tags: ["weeknight", "chicken"] }).tags).toEqual([
      "weeknight",
      "chicken",
    ]);
  });

  it(`refuses a tag over ${MAX_TAG_NAME} characters`, () => {
    const tags = ["a".repeat(MAX_TAG_NAME + 1)];

    expect(recipeSchema.safeParse({ ...valid, tags }).success).toBe(false);
    expect(recipeSchema.safeParse({ ...valid, tags: ["a".repeat(MAX_TAG_NAME)] }).success).toBe(
      true,
    );
  });

  it(`refuses more than ${MAX_TAGS} tags`, () => {
    const tags = Array.from({ length: MAX_TAGS + 1 }, (_, index) => `tag ${index}`);

    expect(recipeSchema.safeParse({ ...valid, tags }).success).toBe(false);
    expect(recipeSchema.safeParse({ ...valid, tags: tags.slice(1) }).success).toBe(true);
  });

  it("points a tag error at the tags field", () => {
    const result = recipeSchema.safeParse({ ...valid, tags: ["a".repeat(MAX_TAG_NAME + 1)] });

    expect(result.error?.issues[0]?.path[0]).toBe("tags");
  });

  it("points an error at the field it belongs to", () => {
    const result = recipeSchema.safeParse({ ...valid, title: "" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["title"]);
  });

  it("points an ingredient error at its row", () => {
    const result = recipeSchema.safeParse({ ...valid, ingredients: [{ name: "" }] });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["ingredients", 0, "name"]);
  });
});

describe("ingredientSchema", () => {
  it("accepts a name on its own", () => {
    const result = ingredientSchema.parse({ name: "Flour", quantity: "", unit: "" });

    expect(result).toMatchObject({ name: "Flour", quantity: null, unit: null });
  });

  it("refuses a blank name", () => {
    expect(ingredientSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("keeps a quantity as the text it was typed as", () => {
    const row = { name: "Flour", quantity: "1 1/2", unit: "cups" };

    expect(ingredientSchema.parse(row).quantity).toBe("1 1/2");
  });

  // The form sends all three keys, blank ones as "". A row missing a key is
  // refused rather than read as an empty field.
  it("refuses a row with a key missing", () => {
    expect(ingredientSchema.safeParse({ name: "Flour", quantity: "1" }).success).toBe(false);
  });
});

describe("validateImage", () => {
  it("accepts every type the form offers", () => {
    for (const type of IMAGE_CONTENT_TYPES) {
      expect(validateImage(imageFile({ type }))).toBeNull();
    }
  });

  it("refuses another type", () => {
    expect(validateImage(imageFile({ type: "image/gif" }))).toBe(
      "Photo must be a JPEG, PNG or WebP",
    );
  });

  it("refuses a file over the size limit", () => {
    expect(validateImage(imageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 }))).toBe(
      "Photo must be smaller than 4MB",
    );
  });

  it("accepts a file at the size limit", () => {
    expect(validateImage(imageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES }))).toBeNull();
  });
});
