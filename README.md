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
pnpm test
```

All four run on every pull request, through `.github/workflows/checks.yml`,
except `pnpm build`, which Vercel runs for the preview deployment.

## Tests

Tests are written with [Vitest](https://vitest.dev). `pnpm test` watches, and
`pnpm test:run` runs once. `pnpm test:coverage` writes a report to `coverage/`.

The tests that need a database need the test database running:

```bash
docker compose up -d --wait postgres-test
```

That is a second Postgres, on port 5433, holding `recipes_test`. It is separate
from the development database so a test run cannot empty the recipes you are
working with, and its data lives on tmpfs, so stopping the container throws it
away. It sits behind the `test` profile, so `docker compose up -d` does not
start it. Naming it on the command line starts it anyway, as above.

There are two suites, and `pnpm test` runs both:

- `unit`, for `src/**/*.test.ts`. Pure functions, no database, run in parallel.
- `db`, for `tests/db/**/*.test.ts`. One test database shared, so these files
  run one at a time.

The schema is built once before the suite starts, by dropping both schemas and
applying the migrations. Between tests, `TRUNCATE recipes, recipe_slugs RESTART
IDENTITY CASCADE` empties everything, since ingredients and slug history cascade
from recipes. Rolling back a transaction would be faster, but the code under
test opens transactions of its own on a pooled connection, so it cannot share
one with the test.

The connection string is in `.env.test`, which is committed because it holds no
secret. The database name has to end in `_test` or the run is refused, checked
before any test connects and again in the code that truncates.

A server action reaches for `next/headers`, `next/cache`, `next/navigation` and
the photo store. `tests/support/next-mocks.ts` stands in for all four, and is
loaded before any test file so its mocks take effect. `redirect` throws there as
it does in Next, carrying the address, so a test can read where the reader was
sent.

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

## Site address

The site origin comes from `siteUrl` in `src/lib/site.ts`, and the production
domain appears nowhere in the code. It reads, in order:

1. `SITE_URL`, a full address with its scheme, for a self-hosted run.
2. `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel sets to the project's production domain, with no scheme, on preview deployments too.
3. `http://localhost:3000`, for local development.

`absoluteUrl` resolves a path against that origin and leaves an address that
already carries one alone. Photos on Vercel Blob are absolute already, so only
the local fallback under `public/uploads` needs the origin adding.

## Design

Every colour is a theme token in `src/app/globals.css`. No component writes a
colour of its own, so a dark palette is a second set of values for those tokens
rather than a second set of components.

Type is two families, loaded through `next/font` and subset to Latin:

- Archivo, one variable file with the width axis, set at 88% for the site name,
  page titles, section headings, ingredient quantities and step numbers
- Atkinson Hyperlegible, regular and bold, for everything you read

Atkinson was drawn by the Braille Institute for readers with low vision, which
is the same problem as reading a recipe from half a metre away. Both families
have fallback metrics in Next, so the page does not shift as the files arrive.
Three files load for Latin text. The build also emits Latin Extended files that
Latin text never requests.

There are two container widths, both tokens:

- `--container-page`, 56rem, used by a recipe, the new form and the edit form
- `--container-wide`, 76rem, defined for the two-column home page in #14

`main` in `src/app/layout.tsx` no longer caps the width. Each page applies the
`.page` class, and the home page will add `.page--wide` when the tag sidebar
arrives.

Ingredients are a table with a fixed quantity column and a rule under each row.
The method is a list with the step number hanging in the left margin. The two
are set differently on purpose, so a cook can tell them apart and keep their
place. On a screen wider than 1024px the ingredients stay beside the method as
it scrolls.

A recipe page has a `@media print` block. Printing drops the site header, the
buttons and the photo, and sets the rest for paper. It prints whatever is on
screen, so a scaled ingredient list prints scaled.

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

## Write access

Reading is open to everyone. The recipe list, search, a recipe page and the
photos need no password. Adding, changing and deleting a recipe need one.

The password is `RECIPES_WRITE_PASSWORD`, read from the environment. It is asked
for through HTTP basic auth, so the browser shows its own prompt. Any username
works, because there is one shared password rather than accounts. Basic auth
sends the password on every request, so the site has to be served over HTTPS,
which Vercel does.

The password is checked in two places:

- `src/proxy.ts`, for `/recipes/new` and `/recipes/<slug>/edit`, which returns
  the 401 that makes the browser prompt
- `saveRecipe` and `deleteRecipe` in `src/app/recipes/actions.ts`

Both are needed. A server function is a POST to the page that holds it, and the
delete button sits on the public recipe page, so no path matcher can cover it.

With no password set, the write pages refuse in every environment, and a
production build fails rather than shipping a site anyone can edit. A local
build and a preview build do not need the variable.

New recipe, Edit and Delete stay visible to everyone, and a visitor who clicks
one gets the prompt. Hiding them would mean reading the `Authorization` header
on the public pages, which would stop those pages being cached, and browsers do
not reliably send the header outside the protected paths, so the controls would
come and go.

There is no sign-out. Basic auth has none, and this is a choice rather than an
oversight: one author on their own devices is the case being built for, and the
browser drops the password when it closes. On a shared computer the write pages
stay open until then.

## Deploying to Vercel

Import the repository, then under Storage create a Neon Postgres database and a
Blob store, and connect both to the project. Neon provides `DATABASE_URL`, and
the Blob store provides `BLOB_STORE_ID`, which the blob SDK uses together with
the `VERCEL_OIDC_TOKEN` that Vercel issues. No read/write token is needed when
running on Vercel.

Add `RECIPES_WRITE_PASSWORD` yourself, under Settings > Environment Variables. A
production build fails without it. That is the whole setup.

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

## Site icons

The icon is a bowl and spoon in the site's accent blue and pale ground, drawn by hand
in `src/app/icon.svg`. The bowl sits on a 32 unit grid with its edges on even
numbers, so every edge falls on a whole pixel at 16 by 16, where a favicon
spends most of its life. The spoon blurs at that size, which is why the bowl
carries the shape on its own.

Steam above the bowl was the first idea and it had to go: two rising wisps over
a wide bowl read as two eyes over a grin.

Next.js writes the `<head>` tags from the filenames, so the other two files are
built from that SVG and committed. Rebuild them after changing it:

```bash
rsvg-convert -w 16 -h 16 src/app/icon.svg -o /tmp/f16.png
rsvg-convert -w 32 -h 32 src/app/icon.svg -o /tmp/f32.png
rsvg-convert -w 48 -h 48 src/app/icon.svg -o /tmp/f48.png
magick /tmp/f16.png /tmp/f32.png /tmp/f48.png src/app/favicon.ico

rsvg-convert -w 130 -h 130 src/app/icon.svg -o /tmp/mark.png
magick -size 180x180 xc:'#16408c' /tmp/mark.png -gravity center -composite \
  -alpha remove -alpha off -depth 8 -strip src/app/apple-icon.png
```

Both commands need Homebrew's `librsvg` and `imagemagick`.

The Apple icon is a full square with no transparency and no rounded corners,
because iOS rounds and masks the corners itself. Compositing the 130 pixel
render onto a 180 pixel blue square gives the mark the inset iOS expects, and
hides the rounded corners of the tile against the same blue.
