import { describe, expect, it } from "vitest";

import {
  buildPrompt,
  describeFailure,
  generatedRecipeSchema,
  toRecipeInput,
  type GeneratedRecipe,
} from "./recipe-writer";
import { recipeSchema } from "./validation";

const generated: GeneratedRecipe = {
  title: "Red lentil dal",
  description: "A weeknight dal.",
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 25,
  instructions: "Rinse the lentils.\nSimmer for 20 minutes.",
  ingredients: [
    { quantity: "200", unit: "g", name: "Red lentils" },
    { quantity: "", unit: "", name: "Salt" },
  ],
};

describe("toRecipeInput", () => {
  it("carries the recipe across", () => {
    const recipe = toRecipeInput(generated);

    expect(recipe.title).toBe("Red lentil dal");
    expect(recipe.description).toBe("A weeknight dal.");
    expect(recipe.servings).toBe(4);
    expect(recipe.prepTimeMinutes).toBe(10);
    expect(recipe.cookTimeMinutes).toBe(25);
  });

  it("reads an empty string as no value", () => {
    const recipe = toRecipeInput({ ...generated, description: "   " });

    expect(recipe.description).toBeNull();
    expect(recipe.ingredients[1]).toEqual({ name: "Salt", quantity: null, unit: null });
  });

  it("drops blank lines from the method", () => {
    const recipe = toRecipeInput({
      ...generated,
      instructions: "Rinse the lentils.\n\n\nSimmer for 20 minutes.\n",
    });

    expect(recipe.instructions).toBe("Rinse the lentils.\nSimmer for 20 minutes.");
  });

  it("drops the model's own step numbers, because the page adds them", () => {
    const recipe = toRecipeInput({
      ...generated,
      instructions: "1. Rinse the lentils.\nStep 2) Simmer for 20 minutes.",
    });

    expect(recipe.instructions).toBe("Rinse the lentils.\nSimmer for 20 minutes.");
  });

  it("keeps a step that opens with a measurement", () => {
    const recipe = toRecipeInput({ ...generated, instructions: "200 g of lentils go in." });

    expect(recipe.instructions).toBe("200 g of lentils go in.");
  });

  it("reads a method of only blank lines as no method", () => {
    expect(toRecipeInput({ ...generated, instructions: "\n  \n" }).instructions).toBeNull();
  });

  it("drops an ingredient with no name", () => {
    const recipe = toRecipeInput({
      ...generated,
      ingredients: [...generated.ingredients, { quantity: "1", unit: "tsp", name: " " }],
    });

    expect(recipe.ingredients.map((row) => row.name)).toEqual(["Red lentils", "Salt"]);
  });

  it("gives something the recipe schema accepts", () => {
    expect(recipeSchema.safeParse(toRecipeInput(generated)).success).toBe(true);
  });
});

describe("generatedRecipeSchema", () => {
  it("accepts a whole recipe", () => {
    expect(generatedRecipeSchema.safeParse(generated).success).toBe(true);
  });

  it("refuses a time that is not a whole number of minutes", () => {
    expect(generatedRecipeSchema.safeParse({ ...generated, cookTimeMinutes: 2.5 }).success).toBe(
      false,
    );
  });

  it("refuses a reply with a field missing", () => {
    const incomplete: Record<string, unknown> = { ...generated };
    delete incomplete.servings;

    expect(generatedRecipeSchema.safeParse(incomplete).success).toBe(false);
  });
});

/** A gateway error, which carries its status on the error itself. */
function gatewayError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

describe("describeFailure", () => {
  it("repeats what the gateway said when it refuses", () => {
    const message = describeFailure(
      gatewayError("Free tier users do not have access to this model.", 403),
    );

    expect(message).toBe(
      "The AI Gateway refused the request. Free tier users do not have access to this model.",
    );
  });

  it("names the key when a refusal says nothing useful", () => {
    expect(describeFailure(gatewayError("", 401))).toContain("AI_GATEWAY_API_KEY");
  });

  it("says so when the gateway is rate limiting", () => {
    expect(describeFailure(gatewayError("Too many requests.", 429))).toBe(
      "The AI Gateway is rate limiting. Too many requests.",
    );
  });

  it("keeps the first line, because the rest is a stack", () => {
    const message = describeFailure(new Error("Unauthenticated request.\n\nSet the variable."));

    expect(message).toBe("The model could not write a recipe. Unauthenticated request.");
  });

  it("strips the colour codes the gateway writes for a terminal", () => {
    const message = describeFailure(new Error("\u001b[31mUnauthenticated request.\u001b[0m"));

    expect(message).toBe("The model could not write a recipe. Unauthenticated request.");
  });

  it("cuts a very long line", () => {
    const message = describeFailure(new Error("x".repeat(400)));

    expect(message.length).toBeLessThan(250);
    expect(message.endsWith("...")).toBe(true);
  });

  it("falls back when what was thrown is not an error", () => {
    expect(describeFailure("something")).toBe(
      "The model could not write a recipe. Try again, or pick another model.",
    );
  });
});

describe("buildPrompt", () => {
  it("sends the request alone for a first draft", () => {
    expect(buildPrompt({ prompt: "a weeknight dal" })).toBe("a weeknight dal");
  });

  it("sends the request alone when there is nothing to change", () => {
    expect(buildPrompt({ prompt: "a weeknight dal", draft: generated, change: "  " })).toBe(
      "a weeknight dal",
    );
  });

  it("carries the draft and the change together", () => {
    const text = buildPrompt({
      prompt: "a weeknight dal",
      draft: generated,
      change: "make it vegan",
    });

    expect(text).toContain("a weeknight dal");
    expect(text).toContain('"title": "Red lentil dal"');
    expect(text).toContain("Change it as follows: make it vegan");
    expect(text).toContain("leave everything the change does not touch as it is");
  });
});
