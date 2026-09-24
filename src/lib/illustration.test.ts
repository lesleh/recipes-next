import { describe, expect, it } from "vitest";

import {
  groundTurn,
  illustrationProblems,
  illustrationSchema,
  pathPoints,
  readIllustration,
  type Illustration,
} from "./illustration";
import { EXAMPLE_ILLUSTRATIONS, HOME_ILLUSTRATION } from "./illustration-examples";

const bigShape = "M40 40 C120 30 200 60 200 140 C200 200 120 210 40 200 Z";
const scrap = "M10 10 L20 12 L14 20 Z";

function drawing(pieces: Illustration["pieces"]): Illustration {
  return { ground: "blue", pieces };
}

describe("pathPoints", () => {
  it("reads every coordinate of an absolute path", () => {
    expect(pathPoints("M0 0 L10 20 C1 2 3 4 5 6 Q7 8 9 10 Z")).toEqual([
      [0, 0],
      [10, 20],
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
    ]);
  });

  it("takes commas, decimals and negative numbers", () => {
    expect(pathPoints("M-1.5,2 L.5 -3")).toEqual([
      [-1.5, 2],
      [0.5, -3],
    ]);
  });

  it("takes repeated argument groups after one command", () => {
    expect(pathPoints("M0 0 L1 1 2 2")).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it.each([
    ["relative commands", "m0 0 l10 10"],
    ["arcs", "M0 0 A10 10 0 0 1 20 20"],
    ["a path that does not start with M", "L10 10"],
    ["the wrong number of arguments", "M0 0 C1 2 3 4"],
    ["arguments after Z", "M0 0 L1 1 Z 5"],
    ["markup", 'M0 0"/><script>'],
    ["an empty command", "M0 0 L"],
  ])("refuses %s", (_reason, d) => {
    expect(pathPoints(d)).toBeNull();
  });
});

describe("illustrationSchema", () => {
  it("accepts a path that bleeds up to 40 past the canvas", () => {
    const parsed = illustrationSchema.safeParse(
      drawing([
        { kind: "shape", d: "M-40 -40 L360 360 L0 300 Z", colour: "tomato" },
        { kind: "shape", d: scrap, colour: "leaf" },
        { kind: "shape", d: scrap, colour: "leaf" },
        { kind: "shape", d: scrap, colour: "leaf" },
      ]),
    );

    expect(parsed.success).toBe(true);
  });

  it("refuses a path further off the canvas", () => {
    const parsed = illustrationSchema.safeParse(
      drawing([
        { kind: "shape", d: "M0 0 L361 10 Z", colour: "tomato" },
        { kind: "shape", d: scrap, colour: "leaf" },
        { kind: "shape", d: scrap, colour: "leaf" },
        { kind: "shape", d: scrap, colour: "leaf" },
      ]),
    );

    expect(parsed.success).toBe(false);
  });

  it("refuses a colour off the palette", () => {
    const parsed = illustrationSchema.safeParse(
      drawing(Array(4).fill({ kind: "shape", d: scrap, colour: "#ff0000" })),
    );

    expect(parsed.success).toBe(false);
  });

  it("refuses fewer than 4 or more than 16 pieces", () => {
    const piece = { kind: "shape", d: scrap, colour: "leaf" } as const;

    expect(illustrationSchema.safeParse(drawing(Array(3).fill(piece))).success).toBe(false);
    expect(illustrationSchema.safeParse(drawing(Array(17).fill(piece))).success).toBe(false);
  });
});

describe("illustrationProblems", () => {
  it("finds nothing wrong with a drawing that has a main piece", () => {
    expect(
      illustrationProblems(
        drawing([
          { kind: "shape", d: bigShape, colour: "tomato" },
          { kind: "shape", d: scrap, colour: "leaf" },
        ]),
      ),
    ).toEqual([]);
  });

  it("asks for a main piece when every piece is a scrap", () => {
    expect(illustrationProblems(drawing([{ kind: "shape", d: scrap, colour: "leaf" }]))).toEqual([
      expect.stringContaining("no main piece"),
    ]);
  });

  it("refuses a piece that covers most of the canvas", () => {
    expect(
      illustrationProblems(
        drawing([{ kind: "shape", d: "M0 0 L320 0 L320 320 L0 320 Z", colour: "leaf" }]),
      ),
    ).toEqual([expect.stringContaining("more than 60%")]);
  });
});

describe("the hand-made drawings", () => {
  it.each([
    ...EXAMPLE_ILLUSTRATIONS.map(({ dish, illustration }) => [dish, illustration] as const),
    ["the home drawing", HOME_ILLUSTRATION] as const,
  ])("%s meets the rules the model is held to", (_name, illustration) => {
    expect(illustrationSchema.safeParse(illustration).success).toBe(true);
    expect(illustrationProblems(illustration)).toEqual([]);
  });
});

describe("readIllustration", () => {
  it("gives back a stored drawing", () => {
    expect(readIllustration(HOME_ILLUSTRATION)).toEqual(HOME_ILLUSTRATION);
  });

  it("gives null for an empty or broken column", () => {
    expect(readIllustration(null)).toBeNull();
    expect(readIllustration({ ground: "blue", pieces: "nope" })).toBeNull();
  });
});

describe("groundTurn", () => {
  it("gives the same turn for the same slug", () => {
    expect(groundTurn("lemon-drizzle-cake")).toBe(groundTurn("lemon-drizzle-cake"));
  });

  it("stays within a full turn", () => {
    for (const slug of ["a", "red-lentil-dal", "x".repeat(200)]) {
      expect(groundTurn(slug)).toBeGreaterThanOrEqual(0);
      expect(groundTurn(slug)).toBeLessThan(360);
    }
  });
});
