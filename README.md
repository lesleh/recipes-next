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

## Recipe addresses

A recipe is reached at `/recipes/<slug>`, and its numeric id never appears in an
address. The slug is built from the title by `slugify` in `src/lib/slug.ts`:
accented letters are reduced to their base letter, letters from other scripts are
kept as they are, and everything else becomes a hyphen.

Slugs are unique across the whole site, and the rule is enforced on the slug
rather than the title, so `Chocolate cake` and `Chocolate Cake!` collide. A save
that would take a slug another recipe holds is refused with a message. Nothing
invents a numbered suffix. Two titles are refused outright: one that produces an
empty slug, and one that produces `new`, which is already the address of the new
recipe form.

Renaming a recipe changes its address. The `recipe_slugs` table keeps every slug
a recipe has ever held, so an old address still reaches the recipe, in a single
redirect however many times it has been renamed. Because the table holds retired
slugs too, a different recipe cannot take one. A recipe can always take back a
slug from its own history.

Deleting a recipe clears its rows in `recipe_slugs` through the same cascade that
removes its ingredients, so every slug it held is free for another recipe again.

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
Blob store, and connect both to the project. That is the whole setup: Neon
provides `DATABASE_URL`, and the Blob store provides `BLOB_STORE_ID`, which the
blob SDK uses together with the `VERCEL_OIDC_TOKEN` that Vercel issues. No
read/write token is needed when running on Vercel.

Production deployments run their migrations as part of the build, through
`scripts/migrate.mjs`. Preview deployments skip them, because they share the
production database and a branch should not apply its schema before it merges.
Local builds skip them too, so `pnpm build` does not need a reachable database.

Vercel stores the database credentials as secrets, which cannot be read back,
so `vercel env pull` writes `[SENSITIVE]` in place of `DATABASE_URL`. To run
anything against production from a checkout, copy the pooled connection string
out of the Neon dashboard and pass it inline:

```bash
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require" pnpm db:seed
```

An inline variable wins over `.env.local`, so this does not touch the local
database.

Worth knowing:

- Use the pooled connection string rather than the direct one. The pool is
  capped at a single connection per instance when running on Vercel.
- Connection strings arriving with `sslmode=prefer`, `require` or `verify-ca`
  are rewritten to `verify-full`. Those three currently behave as
  `verify-full` in pg, but are due to take the weaker libpq meaning in pg 9,
  which would drop certificate and hostname checks. Neon certificates come from
  Let's Encrypt, so no extra root certificate is needed.
- Neon on the free plan scales to zero after five minutes and cannot be told not
  to, so the first request after an idle spell pays a cold start.
- Put the function region in the same region as the database, or every query
  crosses the Atlantic twice.
- Preview deployments currently point at the production database. Enable Neon
  branching in the Vercel integration to give each preview its own copy.

## Recipe photos

Photos are generated with Gemini rather than taken. The prompt that keeps them
in a consistent style lives in [docs/recipe-image-prompt.md](docs/recipe-image-prompt.md).
Paste the recipe onto the end of it, generate, then upload the result on the
recipe's edit page.

The three photos in `seed/images` came from the Rails application this replaced.
