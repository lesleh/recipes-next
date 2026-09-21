# Recipes

A small Next.js application for keeping recipes: what goes in them, how long they take,
and how to cook them. Recipes hold an ordered list of ingredients and a free-text
method, and can be searched by name, description or ingredient.

This is a port of an earlier Rails application of the same name.

## Requirements

- Node 24
- pnpm
- Docker, for the local Postgres database

## Getting started

```bash
cp .env.example .env.local
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The application runs at <http://localhost:3000> and starts on the recipe list.
Seeding is optional and adds three sample recipes. It matches on title, so running
it more than once will not create duplicates.

Nothing above needs a Vercel account. The defaults in `.env.example` point at the
Compose database, and with no blob token set, photos are written to
`public/uploads` instead.

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

Each recipe can carry one photo, rendered through `next/image`, which handles
resizing.

## Database

The schema lives in `src/db/schema.ts` and migrations are generated from it:

```bash
pnpm db:generate
pnpm db:migrate
```

Queries go through the standard `pg` driver rather than a hosted-provider one, so
the same code reaches the Compose database locally and a managed Postgres in
production. TLS is decided by `sslmode` in the connection string.

## Photo storage

`src/lib/storage.ts` picks its backend from the environment. With
`BLOB_READ_WRITE_TOKEN` set, photos go to Vercel Blob. Without it, they are written
to `public/uploads`, which is not committed. The two are told apart by the stored
pathname, so a database that has been used both ways still deletes photos correctly.

## Deploying

Set `DATABASE_URL` to the managed Postgres connection string and
`BLOB_READ_WRITE_TOKEN` to a Vercel Blob token, then run `pnpm db:migrate` against
the production database.

## Recipe photos

Photos are generated with Gemini rather than taken. The prompt that keeps them
in a consistent style lives in [docs/recipe-image-prompt.md](docs/recipe-image-prompt.md).
Paste the recipe onto the end of it, generate, then upload the result on the
recipe's edit page.

The three photos in `seed/images` came from the Rails application this replaced.
