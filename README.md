# Recipes

A small Next.js application for keeping recipes: what goes in them, how long they take,
and how to cook them. Recipes hold an ordered list of ingredients and a free-text
method, and can be searched by name, description or ingredient.

This is a port of an earlier Rails application of the same name.

## Requirements

- Node 24 (native TypeScript execution is used by the seed script)
- pnpm
- A Neon Postgres database and a Vercel Blob store, both available on the Vercel Hobby plan

## Getting started

Create the Postgres database and the Blob store under Storage in the Vercel dashboard,
then copy their credentials into `.env.local`:

```bash
cp .env.example .env.local
```

Install, create the schema, and load the sample recipes:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The application runs at <http://localhost:3000> and starts on the recipe list.
Seeding is optional and adds three sample recipes. It matches on title, so running
it more than once will not create duplicates. Photos are uploaded only when
`BLOB_READ_WRITE_TOKEN` is set, and only for recipes that do not already have one.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Data model

A recipe has a title, an optional description, servings, prep and cook times in
minutes, and a method stored as one step per line. It owns many ingredients, each
with a name and an optional quantity and unit, kept in an explicit display order.
Deleting a recipe deletes its ingredients through a foreign key cascade.

Ingredients are edited inline on the recipe form, which holds the rows in React state
and submits them as JSON. Because the form always posts the complete list, saving
replaces a recipe's ingredient rows wholesale rather than diffing them.

Each recipe can carry one photo, stored in Vercel Blob and rendered through
`next/image`, which handles resizing.

## Database

The schema lives in `src/db/schema.ts` and migrations are generated from it:

```bash
pnpm db:generate
pnpm db:migrate
```

Queries go through the Neon WebSocket driver rather than the HTTP one, because
saving a recipe and its ingredients needs a real transaction.

## Recipe photos

Photos are generated with Gemini rather than taken. The prompt that keeps them
in a consistent style lives in [docs/recipe-image-prompt.md](docs/recipe-image-prompt.md).
Paste the recipe onto the end of it, generate, then upload the result on the
recipe's edit page.

The three photos in `seed/images` came from the Rails application this replaced.
