# Cut-paper illustrations for every recipe

Each recipe gets a cut-paper illustration drawn by Claude Opus 5.5 when it is
first created. The drawing is stored in the database and rendered by our own
component. Existing recipes, and any redraw, go through a button on the edit
page.

## Decisions

Style: cut paper. Lopsided, hand-cut shapes, flat colour, detail cut out to
show the paper beneath. Pieces bleed off the edges, with a few small offcuts.

Ground: a fixed pale hand-cut shape behind each drawing. The page colour never
changes. The shape is ours, not the model's, and its rotation comes from a
hash of the slug.

Colour: the slightly muted palette. The whole drawing is faded to 55% as one
piece, with `opacity` on the group, not on each shape.

Text: never drawn in the SVG. Page text scrolls over the drawing, so every
text colour on the recipe page must pass AA over it. See Placement.

Consistency: from the prompt and the schema, not a shape library. The schema
limits the model to our colour tokens, a 320 by 320 canvas and a small set of
path commands. The prompt carries the style rules and 3 worked examples.

Model: `anthropic/claude-opus-5.5` through the existing AI Gateway setup. The
gateway lists it without structured output but with tool use, and the model
refuses a forced tool choice. So the prompt asks for one call to a `draw`
tool, a reply without it counts as a refused drawing, and Zod validates the
tool input.

Output format: structured pieces, not raw SVG. Our component builds the SVG,
so nothing the model writes reaches the page as markup.

When: once, after a new recipe is first saved. Never while a draft is being
refined, and never on an edit. The drafts in `recipe-draft.tsx` are not
saved, so hooking into the create path of the save action is enough. After
that, a drawing only changes when you press the button on the edit page.

Photos: recipes with a photo get a drawing too. It sits in the corner, away
from the photo.

## Output schema

```ts
const colour = z.enum([
  "tomato", "tomato-light", "leaf", "leaf-dark", "leaf-light",
  "lemon", "lemon-dark", "lemon-light", "pith", "plum", "plum-light",
  "lime", "ultramarine", "pink",
  "cut", // the ground colour, for cut-out detail such as veins
]);

const piece = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("shape"), d: path, colour }),
  z.object({ kind: z.literal("stroke"), d: path, colour, width: z.number().min(2).max(12) }),
]);

const illustration = z.object({
  ground: z.enum(["blue", "pink", "green"]),
  pieces: z.array(piece).min(4).max(16),
});
```

`path` allows absolute `M`, `L`, `C`, `Q` and `Z` only, numbers from -40 to
360, and 1,500 characters at most. Absolute commands make the bounds check a
simple parse. No arcs, so every curve is a hand-cut bezier.

## Checks before saving

Rejected drawings are retried once, then dropped. A failed drawing never fails
the save.

- the schema above passes
- every path parses and stays within the bounds
- at least one piece is not a scrap (bounding box over 80 by 80)
- no piece covers more than 60% of the canvas

## The prompt

The system prompt lives in `src/lib/recipe-illustrator.ts`, next to the
writer. It sets the subject (the defining ingredient, never the finished
dish), the piece rules, the composition (weighted to the bottom right) and
what never to draw. A rule added after the first real drawings keeps pith off
the ground, where it disappears.

The examples are the tomato, lemon and aubergine covers from the design
sketches, converted to the schema and passed as JSON after the rules.

User prompt: the title, the category, the cuisine and the ingredient names.
No quantities and no method, which change nothing in the drawing and cost
tokens.

## Database

New columns on `recipes`, in one drizzle migration:

| Column | Type | Purpose |
| --- | --- | --- |
| `illustration` | `jsonb`, nullable | the validated drawing |
| `illustrated_at` | `timestamptz`, nullable | when it was drawn |

## Drawing on create

1. `persistRecipe` saves as now and revalidates as now.
2. For a new recipe only, it schedules `illustrateRecipe(id)` with `after()`
   from `next/server`. An edit schedules nothing.
3. `illustrateRecipe` calls the model, checks the result, writes the columns
   and revalidates the recipe page and its edit page.

Until then, and on failure, the page shows the pale shape on its own.

## Drawing by button

The edit page shows the current drawing with a "Draw illustration" button, or
"Redraw illustration" when one exists. It is the only way an existing recipe
gets a new drawing. It runs while you wait (about 20 to 30 seconds, with a
pending state) and saves the drawing straight away, without saving the rest
of the form. A failure shows an error beside the button and keeps the old
drawing. This is also the way to fill in existing recipes one at a time.

## Rendering

`<RecipeIllustration>`, a server component that returns inline SVG. The
colour tokens go in `globals.css` as `--color-art-*`, with the fade as
`--art-opacity: 0.55`. The dark palette in #13 is a second set of values for
the same tokens.

## Placement

The recipe page shows the recipe's drawing. The home page shows a hand-made
drawing (an olive branch, tomatoes and a chilli) in the same corner, since no
one recipe owns the list.

`position: fixed` in the bottom-right corner at every width, behind the
content, sized `clamp(180px, 28vw, 360px)`. Pieces that run past the edge are
clipped by the window.

Bottom right because the text is left-aligned. Step lines end ragged and
ingredient names are short, so the right edge carries the least text. The
bottom left would sit under the step numbers and quantities, and the top
would sit where the eye reads.

Legibility, checked against every muted colour over the page:

| Text | Needs | Highest opacity that passes |
| --- | --- | --- |
| main ink | 4.5:1 | 63% |
| accent step numbers (large text) | 3:1 | 59% |
| soft ink | 4.5:1 | 18% |

So the fade stays at 55%, and pages with a drawing stop using soft ink. The
breadcrumb, the descriptions and the facts row move to the main ink, and keep
their hierarchy through size and weight. Small accent text fails above 38%, so
quiet and danger buttons get a paper background, and breadcrumb links use the
main ink.

- The page gets bottom padding equal to the drawing's height, so the last
  step and the buttons can scroll clear of it.
- The bottom offset uses `env(safe-area-inset-bottom)` for phones with a home
  bar.
- Always `aria-hidden`, `pointer-events: none`, and hidden in print.

## Backfill

Optional, now that the edit page can draw one recipe at a time. Build it only
if doing them by hand gets tedious.

`scripts/illustrate-recipes.mts`, run with `node --env-file=.env.local
--import tsx`, like the seed. It draws every recipe with no drawing, one at a
time, and is safe to run again. A `--force` flag redraws all of them.

## Cost

About 6,000 tokens in and 4,000 out per drawing, which is about 10p at the
gateway price on 24 September 2026. This is an estimate. The first real calls
will give the true figure.

## Tests

- unit: schema, path bounds check, the 4 checks, prompt builder
- unit: `illustrateRecipe` with the model mocked, including the retry and the
  failure path
- db: creating a recipe schedules a drawing, and editing one does not
- db: the draw action saves a drawing and keeps the old one on failure

## Order of work

1. Colour tokens, `<RecipeIllustration>` and the 3 examples as fixtures.
2. Schema, checks and prompt. Try it on 5 real recipes before going further.
3. Migration and the "Draw illustration" button on the edit page.
4. Automatic drawing when a recipe is created.
5. Placement on the recipe page, with screenshots at desktop and phone widths.
6. Backfill script, if still wanted.

## Follow-ups

- The palette has no brown, so mushrooms, bread and meat are drawn in the
  nearest colour. Add a brown token if that looks wrong in practice.
- The dark palette (#13) needs darker values for the same tokens.
