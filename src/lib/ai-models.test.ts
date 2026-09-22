import { describe, expect, it } from "vitest";

import { DEFAULT_RECIPE_MODEL, RECIPE_MODELS, resolveModel } from "./ai-models";

describe("resolveModel", () => {
  it("keeps a model from the list", () => {
    expect(resolveModel("anthropic/claude-sonnet-5")).toBe("anthropic/claude-sonnet-5");
  });

  it("falls back to the default for a model that is not on the list", () => {
    expect(resolveModel("openai/gpt-5-pro")).toBe(DEFAULT_RECIPE_MODEL);
  });

  it("falls back to the default when the form sent nothing", () => {
    expect(resolveModel(null)).toBe(DEFAULT_RECIPE_MODEL);
  });
});

describe("RECIPE_MODELS", () => {
  it("holds the default", () => {
    expect(RECIPE_MODELS.map((model) => model.id)).toContain(DEFAULT_RECIPE_MODEL);
  });
});
