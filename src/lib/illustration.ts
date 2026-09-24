import { z } from "zod";

/**
 * A recipe's cut-paper illustration, as data rather than markup. The model
 * returns pieces in this shape and our own component draws them, so nothing a
 * model writes reaches the page as SVG.
 */

export const CANVAS = 320;

/** How far past the canvas a piece may run, so it can bleed off the edge. */
const BLEED = 40;

/** The palette, by name. The values live in globals.css as --color-art-*. */
export const ART_COLOURS = [
  "tomato",
  "tomato-light",
  "leaf",
  "leaf-dark",
  "leaf-light",
  "lemon",
  "lemon-dark",
  "lemon-light",
  "pith",
  "plum",
  "plum-light",
  "lime",
  "ultramarine",
  "pink",
  "cut",
] as const;

export const GROUNDS = ["blue", "pink", "green"] as const;

export type ArtColour = (typeof ART_COLOURS)[number];
export type Ground = (typeof GROUNDS)[number];

const PATH_TOKEN = /[MLCQZ]|-?\d*\.?\d+/g;
const ARGUMENTS: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };

/**
 * Every coordinate in a path, or null when it is not one we accept. Absolute
 * M, L, C, Q and Z only: absolute so the bounds check is a plain read, and no
 * arcs, so every curve is a bezier.
 */
export function pathPoints(d: string): Array<[number, number]> | null {
  if (d.replace(PATH_TOKEN, "").replace(/[\s,]/g, "") !== "") return null;

  const tokens = d.match(PATH_TOKEN) ?? [];
  const points: Array<[number, number]> = [];
  let index = 0;

  if (tokens[0] !== "M") return null;

  while (index < tokens.length) {
    const command = tokens[index];
    const count = ARGUMENTS[command];

    if (count === undefined) return null;
    index += 1;

    const numbers: number[] = [];
    while (index < tokens.length && ARGUMENTS[tokens[index]] === undefined) {
      numbers.push(Number(tokens[index]));
      index += 1;
    }

    if (count === 0 ? numbers.length > 0 : numbers.length === 0 || numbers.length % count !== 0) {
      return null;
    }

    for (let i = 0; i < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  }

  return points;
}

function inBounds([x, y]: [number, number]) {
  return x >= -BLEED && x <= CANVAS + BLEED && y >= -BLEED && y <= CANVAS + BLEED;
}

const path = z
  .string()
  .max(1500)
  .describe(
    "An SVG path on the 320 by 320 canvas, using absolute M, L, C, Q and Z commands only. Coordinates from -40 to 360.",
  )
  .refine((d) => pathPoints(d)?.every(inBounds) === true, {
    message: "Path must use absolute M, L, C, Q and Z commands, with coordinates from -40 to 360",
  });

const colour = z
  .enum(ART_COLOURS)
  .describe('A palette colour. "cut" is the colour of the paper behind, for cut-out detail.');

const shape = z.object({
  kind: z.literal("shape"),
  d: path,
  colour,
});

const stroke = z.object({
  kind: z.literal("stroke"),
  d: path,
  colour,
  width: z.number().min(2).max(12).describe("Stroke width, drawn with round ends."),
});

export const illustrationSchema = z.object({
  ground: z
    .enum(GROUNDS)
    .describe("The pale paper behind the pieces. Pick the one that contrasts best with the main piece."),
  pieces: z
    .array(z.discriminatedUnion("kind", [shape, stroke]))
    .min(4)
    .max(16)
    .describe("The cut pieces, bottom first. Later pieces sit on top of earlier ones."),
});

export type Illustration = z.infer<typeof illustrationSchema>;
export type Piece = Illustration["pieces"][number];

function boundingBox(d: string) {
  const points = pathPoints(d) ?? [];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);

  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

/**
 * What is wrong with a drawing the schema accepted, as sentences a model can
 * act on. Empty when it is fine. These catch the ways a drawing goes wrong
 * that a schema cannot express: all scraps, or one piece swallowing the canvas.
 */
export function illustrationProblems(illustration: Illustration) {
  const problems: string[] = [];
  const boxes = illustration.pieces.map((piece) => boundingBox(piece.d));

  if (!boxes.some((box) => box.width >= 80 && box.height >= 80)) {
    problems.push("There is no main piece. At least one piece must be 80 by 80 or larger.");
  }

  if (boxes.some((box) => box.width * box.height > CANVAS * CANVAS * 0.6)) {
    problems.push("A piece covers more than 60% of the canvas. Make it smaller.");
  }

  return problems;
}

/**
 * A stored drawing, or null when the column holds nothing usable. The column
 * is jsonb, so it is parsed again on the way out rather than trusted.
 */
export function readIllustration(value: unknown): Illustration | null {
  const parsed = illustrationSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}

/**
 * The turn of the pale paper behind a drawing, from the slug, so two recipes
 * that pick the same ground still sit on different shapes.
 */
export function groundTurn(slug: string) {
  let hash = 0;

  for (const character of slug) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;

  return hash % 360;
}
