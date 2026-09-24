import { beforeEach, describe, expect, it, vi } from "vitest";

import { HOME_ILLUSTRATION } from "./illustration-examples";

const generateText = vi.hoisted(() => vi.fn());

// Only the call to the gateway is stood in for. The prompt, the checks and the
// retry are the code under test.
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText,
}));

const { askModelForIllustration, buildIllustrationPrompt, ILLUSTRATION_MODEL, SYSTEM_PROMPT } =
  await import("./recipe-illustrator");

const subject = {
  title: "Lemon drizzle cake",
  category: "Dessert",
  cuisine: null,
  ingredients: ["lemons", "butter", "caster sugar"],
};

const drew = (input: unknown) => ({ toolCalls: [{ toolName: "draw", input }] });
const allScraps = {
  ground: "pink",
  pieces: Array(4).fill({ kind: "shape", d: "M0 0 L10 0 L5 8 Z", colour: "lemon" }),
};

beforeEach(() => {
  generateText.mockReset();
});

describe("buildIllustrationPrompt", () => {
  it("names the dish, the course, the cuisine and the ingredients", () => {
    expect(buildIllustrationPrompt({ ...subject, cuisine: "British" })).toBe(
      [
        "Draw: Lemon drizzle cake",
        "Course: Dessert",
        "Cuisine: British",
        "Ingredients: lemons, butter, caster sugar",
      ].join("\n"),
    );
  });

  it("leaves out what the recipe does not have", () => {
    expect(
      buildIllustrationPrompt({ title: "Toast", category: null, cuisine: null, ingredients: [] }),
    ).toBe("Draw: Toast");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("carries the three examples", () => {
    expect(SYSTEM_PROMPT).toContain("Example: Tomato and basil spaghetti");
    expect(SYSTEM_PROMPT).toContain("Example: Lemon drizzle cake");
    expect(SYSTEM_PROMPT).toContain("Example: Aubergine parmigiana");
  });
});

describe("askModelForIllustration", () => {
  it("asks Opus 5.5 once and gives back a drawing that passes", async () => {
    generateText.mockResolvedValue(drew(HOME_ILLUSTRATION));

    await expect(askModelForIllustration(subject)).resolves.toEqual(HOME_ILLUSTRATION);

    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText.mock.calls[0][0]).toMatchObject({
      model: ILLUSTRATION_MODEL,
      prompt: expect.stringContaining("Draw: Lemon drizzle cake"),
    });
  });

  it("asks again with the reasons when the first drawing fails the checks", async () => {
    generateText
      .mockResolvedValueOnce(drew(allScraps))
      .mockResolvedValueOnce(drew(HOME_ILLUSTRATION));

    await expect(askModelForIllustration(subject)).resolves.toEqual(HOME_ILLUSTRATION);

    expect(generateText).toHaveBeenCalledTimes(2);
    expect(generateText.mock.calls[1][0].prompt).toContain("There is no main piece");
  });

  it("asks again when the model answers without calling the tool", async () => {
    generateText
      .mockResolvedValueOnce({ toolCalls: [] })
      .mockResolvedValueOnce(drew(HOME_ILLUSTRATION));

    await expect(askModelForIllustration(subject)).resolves.toEqual(HOME_ILLUSTRATION);

    expect(generateText.mock.calls[1][0].prompt).toContain("You did not call the draw tool.");
  });

  it("gives up after two refused drawings", async () => {
    generateText.mockResolvedValue(drew({ ground: "pink", pieces: [] }));

    await expect(askModelForIllustration(subject)).rejects.toThrow("refused twice");

    expect(generateText).toHaveBeenCalledTimes(2);
  });

  it("lets a failed gateway call through", async () => {
    generateText.mockRejectedValue(new Error("No access to this model at this time."));

    await expect(askModelForIllustration(subject)).rejects.toThrow("No access");
  });
});
