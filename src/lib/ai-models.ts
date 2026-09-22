/**
 * The models the recipe writer offers, cheapest first. A plain
 * "creator/model-name" string routes through the Vercel AI Gateway, so adding
 * a model here is the whole change. Only list models the gateway marks as
 * supporting structured output, or the recipe comes back as prose.
 *
 * Prices per million tokens when this list was written, on 22 September 2026,
 * from https://vercel.com/ai-gateway/models:
 *
 *   openai/gpt-5-nano             $0.05 in, $0.40 out
 *   google/gemini-2.5-flash-lite  $0.10 in, $0.40 out
 *   google/gemma-4-31b-it         $0.14 in, $0.40 out
 *   google/gemini-3.8-flash       $0.75 in, $3.75 out
 *   anthropic/claude-sonnet-5     $2.00 in, $10.00 out
 */
export const RECIPE_MODELS = [
  { id: "openai/gpt-5-nano", label: "GPT-5 nano" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { id: "google/gemma-4-31b-it", label: "Gemma 4 31B" },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5" },
] as const;

export type RecipeModelId = (typeof RECIPE_MODELS)[number]["id"];

/** Cheap enough to use without thinking, and strong enough to be the default. */
export const DEFAULT_RECIPE_MODEL: RecipeModelId = "google/gemini-3.8-flash";

/**
 * The model to ask, given whatever the form submitted. A form value cannot be
 * trusted even behind a password, and an unknown model string would send our
 * spend wherever the sender chose, so anything off the list becomes the
 * default.
 */
export function resolveModel(value: unknown): RecipeModelId {
  if (typeof value !== "string") return DEFAULT_RECIPE_MODEL;

  const known = RECIPE_MODELS.find((model) => model.id === value);

  return known ? known.id : DEFAULT_RECIPE_MODEL;
}

/** Long enough for a fussy request, short enough to cap what we pay to read. */
export const MAX_PROMPT_LENGTH = 500;
