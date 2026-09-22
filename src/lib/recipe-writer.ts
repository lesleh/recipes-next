import { generateText, Output } from "ai";
import { z } from "zod";

import type { RecipeModelId } from "./ai-models";
import type { RecipeInput } from "./validation";

export const GATEWAY_KEY_MISSING =
  "AI_GATEWAY_API_KEY is not set, so no recipe can be written. Add it to .env.local, or to the Vercel project in production.";

/**
 * What we ask a model for. This is deliberately not `recipeSchema` from
 * ./validation: that one reads an HTML form, so it preprocesses blank strings
 * to null and coerces numbers out of strings, and a preprocess step is not
 * something a provider can turn into a JSON schema.
 *
 * Every field is required and every optional value is an empty string, because
 * a model handles "leave it empty" better than a missing key. The text in each
 * `describe` is what the model is told, so it carries the house rules.
 */
export const generatedRecipeSchema = z.object({
  title: z.string().describe("The name of the dish. No ending full stop."),
  description: z
    .string()
    .describe("One or two sentences about the dish. Empty if there is nothing worth saying."),
  servings: z.number().int().positive().describe("How many people the recipe serves."),
  prepTimeMinutes: z.number().int().positive().describe("Preparation time in whole minutes."),
  cookTimeMinutes: z.number().int().positive().describe("Cooking time in whole minutes."),
  instructions: z
    .string()
    .describe(
      "The method, one step per line, in the order they are done. Do not number the steps and do not leave blank lines between them. The page numbers them itself.",
    ),
  ingredients: z
    .array(
      z.object({
        quantity: z
          .string()
          .describe('The amount in digits, such as "200". Empty for "salt to taste".'),
        unit: z.string().describe('The unit, such as "g", "ml" or "tbsp". Empty for "2 eggs".'),
        name: z.string().describe("The ingredient on its own, without the quantity or the unit."),
      }),
    )
    .describe("Every ingredient, in the order the method uses them."),
});

export type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>;

const SYSTEM_PROMPT = [
  "You write recipes for a home cook's own collection.",
  "Give real quantities, a method that works, and nothing else: no notes, no serving suggestions, no commentary.",
  "Use metric units and British ingredient names.",
].join(" ");

function blankToNull(value: string) {
  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

/**
 * Drop a step's own numbering. Models number their steps whatever the schema
 * says, and the page numbers them again. Only digits followed by punctuation
 * go, so a step opening with a measurement is left alone.
 */
function tidySteps(instructions: string) {
  const steps = instructions
    .split("\n")
    .map((line) => line.trim().replace(/^(?:step\s*)?\d+\s*[.):]\s*/i, "").trim())
    .filter((line) => line !== "");

  return steps.length > 0 ? steps.join("\n") : null;
}

/**
 * A generated recipe in the shape the save path already takes. The result
 * still goes through `recipeSchema`, so a model meets the same length limits
 * as a person typing the form.
 */
export function toRecipeInput(generated: GeneratedRecipe): RecipeInput {
  return {
    title: generated.title.trim(),
    description: blankToNull(generated.description),
    servings: generated.servings,
    prepTimeMinutes: generated.prepTimeMinutes,
    cookTimeMinutes: generated.cookTimeMinutes,
    instructions: tidySteps(generated.instructions),
    ingredients: generated.ingredients
      .filter((row) => row.name.trim() !== "")
      .map((row) => ({
        name: row.name.trim(),
        quantity: blankToNull(row.quantity),
        unit: blankToNull(row.unit),
      })),
  };
}

/**
 * Ask a model for a recipe. The model is a plain "creator/model-name" string,
 * which routes through the Vercel AI Gateway on `AI_GATEWAY_API_KEY`, so no
 * provider package is installed.
 */
export async function askModelForRecipe(prompt: string, model: RecipeModelId) {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: generatedRecipeSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  });

  return output;
}
