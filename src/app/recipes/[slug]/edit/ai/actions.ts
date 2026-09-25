"use server";

import { persistDraft, requireWriteAccess } from "@/app/recipes/save";
import { MAX_CHANGE_LENGTH, resolveModel } from "@/lib/ai-models";
import {
  askModelForRecipe,
  describeFailure,
  fromSavedRecipe,
  GATEWAY_KEY_MISSING,
  generatedRecipeSchema,
  type GeneratedRecipe,
} from "@/lib/recipe-writer";
import { findRecipeById } from "@/lib/recipes";

/**
 * The changed recipe in hand, and what went wrong last time. Until the first
 * change there is no draft, and the saved recipe is the one being changed.
 * The draft reaches the server through the form state, so it is parsed again
 * on arrival, as on the page that writes a new recipe.
 */
export type AiEditState = {
  draft: GeneratedRecipe | null;
  error: string | null;
};

/** Which button was pressed. Anything else is treated as a change. */
type Intent = "change" | "save" | "discard";

function text(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function draftFrom(state: AiEditState | undefined) {
  const parsed = generatedRecipeSchema.safeParse(state?.draft);

  return parsed.success ? parsed.data : null;
}

export async function changeRecipe(
  previousState: AiEditState,
  formData: FormData,
): Promise<AiEditState> {
  await requireWriteAccess();

  const intent = text(formData, "intent") as Intent;
  const draft = draftFrom(previousState);

  // Read from the database rather than the page, so the first change starts
  // from the recipe as saved and not from whatever the browser sent.
  const existing = await findRecipeById(Number(text(formData, "id")));

  if (!existing) return { draft: null, error: "This recipe no longer exists." };

  if (intent === "discard") return { draft: null, error: null };

  if (intent === "save") {
    if (!draft) return { draft: null, error: "Nothing has changed yet." };

    return { draft, error: await persistDraft(draft, existing) };
  }

  if (!process.env.AI_GATEWAY_API_KEY) return { draft, error: GATEWAY_KEY_MISSING };

  const change = text(formData, "change");

  if (change === "") return { draft, error: "Say what should change about the recipe." };

  if (change.length > MAX_CHANGE_LENGTH) {
    return { draft, error: `Ask for the change in ${MAX_CHANGE_LENGTH} characters or fewer.` };
  }

  try {
    const written = await askModelForRecipe({
      model: resolveModel(formData.get("model")),
      draft: draft ?? fromSavedRecipe(existing),
      change,
    });

    return { draft: written, error: null };
  } catch (error) {
    console.error(`Changing recipe ${existing.id} failed`, error);

    return { draft, error: describeFailure(error, "change the recipe") };
  }
}
