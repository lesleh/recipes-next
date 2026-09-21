import type { Ingredient, Recipe } from "@/db/schema";

/** Mirrors Ingredient#to_s: "200 g plain flour", skipping any blank part. */
export function ingredientLabel(ingredient: Pick<Ingredient, "quantity" | "unit" | "name">) {
  return [ingredient.quantity, ingredient.unit, ingredient.name]
    .map((part) => part?.trim())
    .filter((part) => part)
    .join(" ");
}

/** The method is stored as free text, one step per line. */
export function instructionSteps(instructions: Recipe["instructions"]) {
  return (instructions ?? "")
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter((step) => step.length > 0);
}

export function totalTimeMinutes(recipe: Pick<Recipe, "prepTimeMinutes" | "cookTimeMinutes">) {
  if (recipe.prepTimeMinutes === null && recipe.cookTimeMinutes === null) return null;

  return (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function truncate(text: string, length: number) {
  return text.length <= length ? text : `${text.slice(0, length - 3).trimEnd()}...`;
}
