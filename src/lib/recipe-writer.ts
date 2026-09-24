import { generateText, Output } from "ai";
import { z } from "zod";

import type { RecipeModelId } from "./ai-models";
import { parseTags } from "./tags";
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
  category: z.string().describe('The course, such as "Main course", "Dessert" or "Side dish".'),
  cuisine: z
    .string()
    .describe(
      'The cooking tradition the dish belongs to, such as "Italian" or "Thai". Empty if it belongs to none.',
    ),
  tags: z
    .string()
    .describe(
      "Up to five short terms someone would look for this dish by, separated by commas. One or two words each, reusable across recipes, such as \"weeknight\" or \"freezer friendly\". Not a phrase, and not the category or the cuisine again.",
    ),
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
    category: blankToNull(generated.category),
    cuisine: blankToNull(generated.cuisine),
    tags: parseTags([generated.tags]),
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

/** The status a gateway or provider error carries, when it carries one. */
function statusOf(error: unknown) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;

  const status = (error as { statusCode?: unknown }).statusCode;

  return typeof status === "number" ? status : undefined;
}

/**
 * The first line of what the gateway said, which is the part worth reading.
 * The rest is a stack, and the message arrives with terminal colour codes in
 * it, which would show as gibberish on the page.
 */
function detailOf(error: unknown) {
  if (!(error instanceof Error)) return "";

  const line = error.message
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part !== "");

  if (!line) return "";

  return line.length > 200 ? `${line.slice(0, 199)}...` : line;
}

/**
 * What to tell the reader when the model call throws. The reason is nearly
 * always something only the owner can fix, such as a key the gateway refuses
 * or a model the account cannot reach, so it is repeated on the page rather
 * than left in the server log.
 */
export function describeFailure(error: unknown) {
  const detail = detailOf(error);
  const status = statusOf(error);

  if (status === 401 || status === 403) {
    return detail
      ? `The AI Gateway refused the request. ${detail}`
      : "The AI Gateway refused the request. Check AI_GATEWAY_API_KEY.";
  }

  if (status === 429) {
    return detail
      ? `The AI Gateway is rate limiting. ${detail}`
      : "The AI Gateway is rate limiting. Try again in a minute.";
  }

  return detail
    ? `The model could not write a recipe. ${detail}`
    : "The model could not write a recipe. Try again, or pick another model.";
}

/**
 * What to send the model: the request on its own for a first draft, or the
 * draft in hand and what to change about it.
 *
 * A change carries the whole draft rather than a conversation, so the server
 * keeps nothing between rounds and a round costs the same whether it is the
 * first or the fifth.
 */
export function buildPrompt({
  prompt,
  draft = null,
  change = "",
}: {
  prompt: string;
  draft?: GeneratedRecipe | null;
  change?: string;
}) {
  if (!draft || change.trim() === "") return prompt.trim();

  return [
    `This recipe was written for the request: ${prompt.trim()}`,
    "",
    JSON.stringify(draft, null, 2),
    "",
    `Change it as follows: ${change.trim()}`,
    "Return the whole recipe, and leave everything the change does not touch as it is.",
  ].join("\n");
}

/**
 * Ask a model for a recipe, or for a changed version of the draft in hand.
 * The model is a plain "creator/model-name" string, which routes through the
 * Vercel AI Gateway on `AI_GATEWAY_API_KEY`, so no provider package is
 * installed.
 */
export async function askModelForRecipe({
  prompt,
  model,
  draft = null,
  change = "",
}: {
  prompt: string;
  model: RecipeModelId;
  draft?: GeneratedRecipe | null;
  change?: string;
}) {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: generatedRecipeSchema }),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt({ prompt, draft, change }),
  });

  return output;
}
