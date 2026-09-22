# Recipe image prompt

A fixed prompt for generating recipe photographs with Gemini. The point of it is
consistency. Every image should look like it came from the same shoot, so the
style block never changes and only the recipe underneath it does.

## How to use it

1. Open the recipe's edit page and press Copy image prompt, under Photo. That
   puts the style block and the recipe on your clipboard, in that order.
2. Paste it into Gemini.
3. Generate, then download the result as a JPEG or PNG.
4. Upload it on the recipe's edit page under Photo.

Two habits keep the results consistent.

- Paste the style block unchanged every time. Editing it for one dish is how a
  set of images starts to drift apart.
- If an image comes out wrong, start a new conversation and generate again
  rather than asking for changes in a follow-up message. Conversational edits
  pull the result away from the house style.

## The prompt

The text itself lives in `src/lib/recipe-image-prompt.ts`, as
`IMAGE_PROMPT_PREFIX`, so that the button and this document cannot drift apart.
`imagePromptFor` joins it to the recipe, written out as plain text.

It ends with a horizontal rule, and the recipe follows it.

## Automating it later

The prompt is deliberately split into a fixed part and a variable part. When this
moves to the Gemini API, send `IMAGE_PROMPT_PREFIX` as the fixed prefix and the
recipe as the only variable content, which is what `imagePromptFor` already
does. Keeping the prefix byte-identical across calls is what holds the style
together.

The last paragraph before the recipe is there on purpose. A recipe is untrusted
text once it can come from anywhere, and the boundary tells the model to treat it
as a description rather than as instructions.

## Image requirements

The app accepts JPEG, PNG and WebP up to 10MB. It keeps the original and
generates smaller versions on first display, so a source image around 1200px on
the long edge is plenty. The list page crops to a square thumbnail, so keep the
dish centred.
