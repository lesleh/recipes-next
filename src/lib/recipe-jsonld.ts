import type { Ingredient, Recipe } from "@/db/schema";

import { ingredientAmount, instructionSteps, pluralize, totalTimeMinutes } from "./format";
import { absoluteUrl, SITE_AUTHOR, SITE_NAME } from "./site";

type RecipeForJsonLd = Pick<
  Recipe,
  | "title"
  | "description"
  | "servings"
  | "prepTimeMinutes"
  | "cookTimeMinutes"
  | "instructions"
  | "imageUrl"
  | "createdAt"
  | "updatedAt"
> & { ingredients: Pick<Ingredient, "name" | "quantity" | "unit">[] };

type HowToStep = { "@type": "HowToStep"; text: string };
type Person = { "@type": "Person"; name: string };
type ListItem = { "@type": "ListItem"; position: number; name: string; item?: string };

export type RecipeJsonLd = {
  "@context": "https://schema.org";
  "@type": "Recipe";
  name: string;
  author: Person;
  description?: string;
  image?: string;
  recipeYield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeIngredient?: string[];
  recipeInstructions?: HowToStep[];
  datePublished: string;
  dateModified: string;
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
    // One person writes every recipe here, so the author is the site's rather
    // than a field on the recipe.
    author: { "@type": "Person", name: SITE_AUTHOR },
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
    datePublished: recipe.createdAt.toISOString(),
    dateModified: recipe.updatedAt.toISOString(),
  };
}

export type BreadcrumbJsonLd = {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: ListItem[];
};

/**
 * The trail from the recipe list to this recipe, matching the one the page
 * shows. The last item carries no `item`, because it is the page being read
 * and a search engine reads a self address there as a second, separate page.
 */
export function breadcrumbJsonLd(recipe: Pick<Recipe, "title">): BreadcrumbJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: recipe.title },
    ],
  };
}

/**
 * JSON-LD ready for a script tag. JSON.stringify leaves "<" alone, so a title
 * holding "</script>" would end the tag early. Its unicode escape means the
 * same string to a JSON reader and nothing to an HTML parser.
 */
export function jsonLdScript(data: BreadcrumbJsonLd | RecipeJsonLd) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
