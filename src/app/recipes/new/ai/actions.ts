"use server";

import { persistDraft, requireWriteAccess } from "@/app/recipes/save";
import { MAX_CHANGE_LENGTH, MAX_PROMPT_LENGTH, resolveModel } from "@/lib/ai-models";
import {
  askModelForRecipe,
  describeFailure,
  GATEWAY_KEY_MISSING,
  generatedRecipeSchema,
  type GeneratedRecipe,
} from "@/lib/recipe-writer";

/**
 * The draft in hand, and what went wrong last time. Nothing is written until
 * the reader presses save, so the draft lives in this state and in nothing
 * else. It reaches the server through the form state, which makes it as
 * untrusted as any other form value, so it is parsed again on arrival.
 */
export type AiRecipeState = {
  draft: GeneratedRecipe | null;
  error: string | null;
};

/** Which button was pressed. Anything else is treated as a first draft. */
type Intent = "generate" | "change" | "save";

function text(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function draftFrom(state: AiRecipeState | undefined) {
  const parsed = generatedRecipeSchema.safeParse(state?.draft);

  return parsed.success ? parsed.data : null;
}

export async function writeRecipe(
  previousState: AiRecipeState,
  formData: FormData,
): Promise<AiRecipeState> {
  await requireWriteAccess();

  const intent = text(formData, "intent") as Intent;
  const draft = draftFrom(previousState);

  if (intent === "save") return saveDraft(draft);

  if (!process.env.AI_GATEWAY_API_KEY) return { draft, error: GATEWAY_KEY_MISSING };

  const prompt = text(formData, "prompt");
  const change = intent === "change" ? text(formData, "change") : "";

  if (prompt === "") return { draft, error: "Describe a recipe, or paste one in." };

  if (prompt.length > MAX_PROMPT_LENGTH) {
    const count = (n: number) => n.toLocaleString("en-GB");

    return {
      draft,
      error: `The request is ${count(prompt.length)} characters. Keep it to ${count(MAX_PROMPT_LENGTH)} or fewer, such as by leaving out anything that is not the recipe.`,
    };
  }

  if (intent === "change") {
    if (!draft) return { draft: null, error: "There is no draft to change yet." };

    if (change === "") return { draft, error: "Say what should change about the draft." };

    if (change.length > MAX_CHANGE_LENGTH) {
      return { draft, error: `Ask for the change in ${MAX_CHANGE_LENGTH} characters or fewer.` };
    }
  }

  try {
    // A change carries the draft. A first draft carries neither, so the same
    // call covers both.
    const written = await askModelForRecipe({
      prompt,
      model: resolveModel(formData.get("model")),
      draft: intent === "change" ? draft : null,
      change,
    });

    return { draft: written, error: null };
  } catch (error) {
    // Logged whole, and the first line of it goes to the page. The reasons
    // that happen, a refused key or a model the account cannot reach, are all
    // fixed by the person reading, so hiding them helps nobody.
    console.error("Asking for a recipe failed", error);

    return { draft, error: describeFailure(error) };
  }
}

/** The only path that writes. */
async function saveDraft(draft: GeneratedRecipe | null): Promise<AiRecipeState> {
  if (!draft) return { draft: null, error: "There is no draft to save yet." };

  return { draft, error: await persistDraft(draft, null) };
}
