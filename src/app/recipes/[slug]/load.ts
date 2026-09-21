import { notFound, permanentRedirect } from "next/navigation";

import { findCurrentSlug, findRecipeBySlug } from "@/lib/recipes";

/**
 * The recipe at a slug. A slug a rename retired redirects to the address the
 * recipe answers at now, in one hop, because the history points straight at
 * the recipe. Anything else is a 404, including a numeric id.
 *
 * @param suffix the part of the address after the slug, such as "/edit"
 */
export async function loadRecipeBySlug(slug: string, suffix = "") {
  const recipe = await findRecipeBySlug(slug);

  if (recipe) return recipe;

  const current = await findCurrentSlug(slug);

  if (current) permanentRedirect(`/recipes/${current}${suffix}`);

  notFound();
}
