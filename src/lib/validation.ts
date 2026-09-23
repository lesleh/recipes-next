import { z } from "zod";

export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// Vercel caps a function request body at 4.5MB and will not raise it, so the
// limit the form advertises has to sit below that rather than at the 10MB the
// Rails version allowed.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Headroom for the rest of the multipart body, so an oversized photo reaches
// our own validation and gets a readable message instead of a runtime error.
export const MAX_ACTION_BODY_BYTES = MAX_IMAGE_BYTES + 512 * 1024;

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
  category: optionalText(100),
  cuisine: optionalText(100),
  keywords: optionalText(300),
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
