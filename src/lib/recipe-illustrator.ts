import { generateText, tool } from "ai";

import {
  illustrationProblems,
  illustrationSchema,
  type Illustration,
} from "./illustration";
import { EXAMPLE_ILLUSTRATIONS } from "./illustration-examples";

/**
 * Drawing a recipe's cut-paper illustration. The style has to hold across
 * every recipe on the site, and nothing but this prompt and the schema keeps
 * it, so both are strict and the examples go with every request.
 */

/**
 * The gateway lists this model with tool use but not structured output, and
 * the model refuses a forced tool choice. So the prompt asks for the one tool
 * call, and a reply without it counts as a refused drawing.
 */
export const ILLUSTRATION_MODEL = "anthropic/claude-opus-5.5";

const RULES = `You draw cut-paper illustrations of food for a recipe website, in the style of Matisse's paper cut-outs. Every illustration on the site must look like it was made by the same person with the same scissors, so follow these rules exactly.

Canvas: 320 by 320. The page draws a pale hand-cut shape behind your pieces. Do not draw a background.

Subject: the one or two ingredients that define the dish, chosen from the title first, then the ingredients. Never the finished dish, a plate, a pan, a hand or a person. Aubergine parmigiana is an aubergine, not a baked dish.

Pieces:
- Draw 1 large main piece, 1 to 3 supporting pieces and 2 to 4 small offcuts.
- Every shape is slightly lopsided, as if cut by hand. Never a perfect circle, ellipse or rectangle. Use C and Q curves with uneven control points.
- Colour is flat. One colour per piece. No outlines.
- Show detail by cutting it out: a "cut" stroke or shape on top of a piece, such as a leaf vein or lemon segments. Use at most 3 cut details.
- Put one lighter piece on the main piece as a highlight, cut as a crescent.
- Stems, spaghetti and similar thin things are strokes, width 4 to 10.
- Several small pieces of the same colour, such as leaves on a branch, can share one path with several subpaths.
- Let 1 or 2 pieces run past the edge of the canvas.
- Use 3 to 5 colours in total.
- Pith is almost the colour of the ground, so it disappears on its own. Use it only on top of another piece, such as the inside of a lemon. Draw pale foods such as garlic, mushroom stems or cheese in lemon-light or pink instead.

Composition: weight the pieces to the right and bottom, because the drawing sits in the bottom-right corner of the page. Keep the top-left third mostly empty. Leave space between pieces, and overlap only where one thing would lie on another.

Never: text, letters, numbers, faces, gradients, shadows, outlines, patterns, or more than 16 pieces.

Choose the ground that contrasts best with the main piece.

Hand over the finished drawing by calling the draw tool once. Do not answer in text.

Three examples follow. Match their level of detail, their shapes and their proportions. Do not copy them.`;

export const SYSTEM_PROMPT = [
  RULES,
  ...EXAMPLE_ILLUSTRATIONS.map(
    ({ dish, illustration }) => `Example: ${dish}\n${JSON.stringify(illustration)}`,
  ),
].join("\n\n");

export type IllustrationSubject = {
  title: string;
  category: string | null;
  cuisine: string | null;
  ingredients: string[];
};

/**
 * What the model is told about the recipe. Quantities and the method change
 * nothing in the drawing, so they are left out and not paid for.
 */
export function buildIllustrationPrompt(subject: IllustrationSubject) {
  return [
    `Draw: ${subject.title}`,
    subject.category ? `Course: ${subject.category}` : null,
    subject.cuisine ? `Cuisine: ${subject.cuisine}` : null,
    subject.ingredients.length > 0 ? `Ingredients: ${subject.ingredients.join(", ")}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

const draw = tool({
  description: "Hand over the finished cut-paper illustration.",
  inputSchema: illustrationSchema,
});

/** One request, and whatever came back, checked. */
async function requestDrawing(prompt: string) {
  const result = await generateText({
    model: ILLUSTRATION_MODEL,
    system: SYSTEM_PROMPT,
    prompt,
    tools: { draw },
  });

  const call = result.toolCalls.find((candidate) => candidate.toolName === "draw");

  if (!call) return { illustration: null, problems: ["You did not call the draw tool."] };

  const parsed = illustrationSchema.safeParse(call?.input);

  if (!parsed.success) {
    return {
      illustration: null,
      problems: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}.`),
    };
  }

  return { illustration: parsed.data, problems: illustrationProblems(parsed.data) };
}

/**
 * Ask the model for a drawing. A drawing that fails the checks is asked for
 * once more, with the reasons, and then given up on. A failed call to the
 * gateway throws, as the recipe writer's does.
 */
export async function askModelForIllustration(subject: IllustrationSubject): Promise<Illustration> {
  const prompt = buildIllustrationPrompt(subject);
  const first = await requestDrawing(prompt);

  if (first.illustration && first.problems.length === 0) return first.illustration;

  const second = await requestDrawing(
    `${prompt}\n\nAn earlier drawing for this recipe was refused: ${first.problems.join(" ")} Draw it again and avoid that.`,
  );

  if (second.illustration && second.problems.length === 0) return second.illustration;

  throw new Error(`The drawing was refused twice. ${second.problems.join(" ")}`);
}
