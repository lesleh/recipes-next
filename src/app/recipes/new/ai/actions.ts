"use server";

import { redirect } from "next/navigation";

import { checkSlug, persistRecipe, requireWriteAccess } from "@/app/recipes/save";
import { MAX_PROMPT_LENGTH, resolveModel } from "@/lib/ai-models";
import {
  askModelForRecipe,
  describeFailure,
  GATEWAY_KEY_MISSING,
  toRecipeInput,
} from "@/lib/recipe-writer";
import { slugify } from "@/lib/slug";
import { recipeSchema } from "@/lib/validation";

/** One message, because the page has one field worth pointing at. */
export type AiRecipeState = { error: string | null };

export async function writeRecipe(
  _previousState: AiRecipeState,
  formData: FormData,
): Promise<AiRecipeState> {
  await requireWriteAccess();

  if (!process.env.AI_GATEWAY_API_KEY) return { error: GATEWAY_KEY_MISSING };

  const prompt = String(formData.get("prompt") ?? "").trim();

  if (prompt === "") return { error: "Say what you would like a recipe for." };

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { error: `Ask for the recipe in ${MAX_PROMPT_LENGTH} characters or fewer.` };
  }

  const model = resolveModel(formData.get("model"));
  let generated;

  try {
    generated = await askModelForRecipe(prompt, model);
  } catch (error) {
    // Logged whole, and the first line of it goes to the page. The reasons
    // that happen, a refused key or a model the account cannot reach, are all
    // fixed by the person reading, so hiding them helps nobody.
    console.error("Asking for a recipe failed", error);

    return { error: describeFailure(error) };
  }

  // The same schema the form goes through, so a model meets the same limits a
  // person does.
  const parsed = recipeSchema.safeParse(toRecipeInput(generated));

  if (!parsed.success) {
    const reasons = parsed.error.issues.map((issue) => issue.message).join(". ");

    return { error: `The model wrote a recipe this site cannot store. ${reasons}` };
  }

  const recipe = parsed.data;
  const slug = slugify(recipe.title);
  const slugError = await checkSlug(slug, null);

  // Nothing invents a numbered suffix here either. Say what happened and let
  // the next prompt ask for something else.
  if (slugError) return { error: slugError };

  await persistRecipe({ recipe, slug });

  redirect(`/recipes/${slug}`);
}
