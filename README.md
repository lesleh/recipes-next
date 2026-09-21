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

The dev server can run in Compose too, on <http://localhost:3100>:

```bash
docker compose --profile app up -d --build
```

That is off by default because a bind-mounted dev server is slower on macOS than
one on the host. Rebuild the image after changing dependencies, since
`node_modules` lives in a volume holding Linux builds rather than the host's.
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

## Deploying to Vercel

Import the repository, then under Storage create a Neon Postgres database and a
Blob store. Both set their environment variable on the project automatically:
`DATABASE_URL` for the database and `BLOB_READ_WRITE_TOKEN` for the blob store.
Redeploy once so the build picks them up.

Migrations are not part of the build, because a build runs for preview
deployments too. Run them from a checkout instead, against the pooled connection
string that Neon gives you:

```bash
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require" pnpm db:migrate
```

An inline variable wins over `.env.local`, so this does not touch the local
database. The same applies to seeding, which uploads the photos to blob storage
when the token is present:

```bash
DATABASE_URL="..." BLOB_READ_WRITE_TOKEN="..." pnpm db:seed
```

Worth knowing:

- Use the pooled connection string rather than the direct one. The pool is
  capped at a single connection per instance when running on Vercel.
- Neon on the free plan scales to zero after five minutes and cannot be told not
  to, so the first request after an idle spell pays a cold start.
- Put the function region in the same region as the database, or every query
  crosses the Atlantic twice.
- Photos have to go to blob storage once deployed. The local disk fallback
  raises a clear error rather than failing on a read-only filesystem.

## Recipe photos

Photos are generated with Gemini rather than taken. The prompt that keeps them
in a consistent style lives in [docs/recipe-image-prompt.md](docs/recipe-image-prompt.md).
Paste the recipe onto the end of it, generate, then upload the result on the
recipe's edit page.

The three photos in `seed/images` came from the Rails application this replaced.
