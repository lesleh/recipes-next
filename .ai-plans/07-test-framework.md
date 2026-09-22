# Add a test framework (#7)

## Decisions

Runner: Vitest. The Next.js guide recommends it, and its projects feature lets
one command run two suites with different setup.

Dependencies: `vitest` and `@vitest/coverage-v8` only. No jsdom, no React
Testing Library, no `@vitejs/plugin-react`, though the Next.js guide lists all
three. Issue #7 asks for pure functions and database behaviour, not components.
Add them when a component test is first needed.

Paths: Vite resolves the `@/*` paths from `tsconfig.json` itself, through
`resolve.tsconfigPaths`, so `vite-tsconfig-paths` is not needed.

Environment: node for both projects. Nothing rendered, nothing needs a DOM.

Test database: second Postgres in `docker-compose.yml` on port 5433, database
`recipes_test`, behind the `test` profile so it only runs while a test run
needs it. Naming it on the command line starts it despite the profile. Data on
tmpfs, so stopping the container throws it away.

Migrations: applied by `drizzle-orm/node-postgres/migrator` in a global setup,
not by a `drizzle-kit` subprocess. The config file loads `.env.local`, which
the test run must not read.

Reset: `TRUNCATE recipes, recipe_slugs RESTART IDENTITY CASCADE` after each
test, as the issue asks.

Guard: the run is refused unless the database name ends in `_test`, checked
before any test connects and again in the code that truncates. Without it, one
wrong variable empties the development data.

## Two vitest projects

| Project | Files | Database | Reset |
| --- | --- | --- | --- |
| `unit` | `src/**/*.test.ts` | none | none |
| `db` | `tests/db/**/*.test.ts` | migrated once | truncate after each test |

`db` runs in a single fork with `fileParallelism` off. Two files truncating
under each other is the failure this avoids. `unit` runs in parallel.

## Steps

1. Prove the setup works before building on it. Install Vitest, write one test
   for `slugify`, and check that a module holding `"use server"` imports
   without error under Vitest. If it does not, the `actions.ts` tests move to a
   follow-up.
2. Add the test database. A `postgres-test` service in `docker-compose.yml`,
   plus `.env.test` holding its `DATABASE_URL`, committed, because it holds no
   secret. `.gitignore` has to allow it past the `.env*` rule.
3. Add the database setup. A global setup that drops both schemas and applies
   the migrations, a per-file setup that truncates, and the name guard.
4. Write the pure function tests, covering `src/lib/slug.ts`,
   `src/lib/format.ts`, `src/lib/validation.ts` and `src/lib/auth.ts`.
5. Add a row builder in `tests/support`.
6. Write the database tests for `src/lib/recipes.ts`: search by title,
   description and ingredient name, wildcard escaping, ingredient order, and
   `findCurrentSlug` over a rename chain and a deleted recipe.
7. Write the database tests for `src/app/recipes/actions.ts`, with one setup
   file standing in for `next/headers`, `next/navigation`, `next/cache` and
   `@/lib/storage`. Cover a save refused against a retired slug, a recipe
   taking back its own old slug, a reserved and an empty slug, the wholesale
   replacement of ingredient rows, and the delete cascade.
8. Add a GitHub Actions workflow running typecheck, lint and the tests on every
   pull request, against the same compose service. Leave `pnpm build` out: it
   needs a reachable database to collect page data, and Vercel already builds
   every pull request.
9. Add `test`, `test:run` and `test:coverage` scripts, and a README section.
10. Fill the gaps coverage shows: `src/app/recipes/[slug]/load.ts`,
    `src/db/url.ts` and `src/lib/site.ts`.

## Out of scope

Testing the migration backfill, which is #29. It needs a helper that applies
migrations one at a time, and a reset that rebuilds the schema rather than
truncating, so it is a larger piece than the rest of this issue.

`src/proxy.ts` and `src/lib/storage.ts` are left with no tests.
