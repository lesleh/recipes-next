import { z } from "zod";

export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const optionalText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable());

/** Number fields are optional, but must be a whole number above zero when given. */
const optionalPositiveInt = z.preprocess(
  blankToNull,
  z.union([z.null(), z.coerce.number().int().positive()]),
);

export const ingredientSchema = z.object({
  id: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1, "Ingredient name is required").max(200),
  quantity: optionalText(100),
  unit: optionalText(100),
});

export const recipeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(2000),
  servings: optionalPositiveInt,
  prepTimeMinutes: optionalPositiveInt,
  cookTimeMinutes: optionalPositiveInt,
  instructions: optionalText(20000),
  ingredients: z.array(ingredientSchema),
});

export type RecipeInput = z.infer<typeof recipeSchema>;
export type IngredientInput = z.infer<typeof ingredientSchema>;

export function validateImage(file: File) {
  if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return "Photo must be a JPEG, PNG or WebP";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `Photo must be smaller than ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`;
  }

  return null;
}
