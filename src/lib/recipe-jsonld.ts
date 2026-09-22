import type { Ingredient, Recipe } from "@/db/schema";

import { ingredientAmount, instructionSteps, pluralize, totalTimeMinutes } from "./format";
import { absoluteUrl } from "./site";

type RecipeForJsonLd = Pick<
  Recipe,
  | "title"
  | "description"
  | "servings"
  | "prepTimeMinutes"
  | "cookTimeMinutes"
  | "instructions"
  | "imageUrl"
  | "updatedAt"
> & { ingredients: Pick<Ingredient, "name" | "quantity" | "unit">[] };

type HowToStep = { "@type": "HowToStep"; text: string };

export type RecipeJsonLd = {
  "@context": "https://schema.org";
  "@type": "Recipe";
  name: string;
  description?: string;
  image?: string;
  recipeYield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeIngredient?: string[];
  recipeInstructions?: HowToStep[];
  dateModified?: string;
};

/** Minutes as an ISO 8601 duration, such as 20 minutes to "PT20M". */
function isoDuration(minutes: number) {
  return `PT${minutes}M`;
}

/** The amount and the name as one line, the way the recipe page reads. */
function ingredientText(ingredient: Pick<Ingredient, "name" | "quantity" | "unit">) {
  return [ingredientAmount(ingredient), ingredient.name.trim()].filter((part) => part).join(" ");
}

/**
 * A recipe as schema.org Recipe data, for the `application/ld+json` block on
 * the recipe page. Anything the recipe does not hold is left out rather than
 * sent as null or as an empty string, because a search engine reads an empty
 * field as a field with no value rather than as a missing one.
 */
export function recipeJsonLd(recipe: RecipeForJsonLd): RecipeJsonLd {
  const steps = instructionSteps(recipe.instructions);
  const total = totalTimeMinutes(recipe);
  const description = recipe.description?.trim();

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    ...(description ? { description } : {}),
    // Vercel Blob gives back an absolute address already. Only the local
    // fallback under public/uploads needs an origin in front of it.
    ...(recipe.imageUrl ? { image: absoluteUrl(recipe.imageUrl) } : {}),
    ...(recipe.servings === null ? {} : { recipeYield: pluralize(recipe.servings, "serving") }),
    ...(recipe.prepTimeMinutes === null ? {} : { prepTime: isoDuration(recipe.prepTimeMinutes) }),
    ...(recipe.cookTimeMinutes === null ? {} : { cookTime: isoDuration(recipe.cookTimeMinutes) }),
    ...(total === null ? {} : { totalTime: isoDuration(total) }),
    ...(recipe.ingredients.length > 0
      ? { recipeIngredient: recipe.ingredients.map(ingredientText) }
      : {}),
    ...(steps.length > 0
      ? { recipeInstructions: steps.map((text) => ({ "@type": "HowToStep" as const, text })) }
      : {}),
    dateModified: recipe.updatedAt.toISOString(),
  };
}

/**
 * JSON-LD ready for a script tag. JSON.stringify leaves "<" alone, so a title
 * holding "</script>" would end the tag early. Its unicode escape means the
 * same string to a JSON reader and nothing to an HTML parser.
 */
export function jsonLdScript(data: RecipeJsonLd) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
