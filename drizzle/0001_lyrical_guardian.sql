CREATE TABLE "recipe_slugs" (
	"slug" text PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_slugs" ADD CONSTRAINT "recipe_slugs_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_slugs_recipe_id_idx" ON "recipe_slugs" USING btree ("recipe_id");--> statement-breakpoint
-- Added without NOT NULL so the rows already in the table can be filled in
-- below. The constraint goes on once every row has a slug.
ALTER TABLE "recipes" ADD COLUMN "slug" text;--> statement-breakpoint
-- The same rule as slugify() in src/lib/slug.ts: decompose, drop the combining
-- accents, lowercase, then turn every run of other characters into a hyphen.
-- [[:alnum:]] matches letters and numbers from any script in a UTF-8 database,
-- which is what \p{L} and \p{N} do in the TypeScript version.
UPDATE "recipes" SET "slug" = trim(
	both '-' from regexp_replace(
		lower(regexp_replace(normalize("title", NFKD), '[̀-ͯ]', '', 'g')),
		'[^[:alnum:]]+', '-', 'g'
	)
);--> statement-breakpoint
-- Three titles the rule cannot settle on its own. Stop and let someone rename
-- the recipe rather than write a slug nobody asked for.
DO $$
DECLARE
	offending text;
BEGIN
	SELECT string_agg(format('%s (id %s)', "title", "id"), ', ' ORDER BY "id")
	INTO offending
	FROM "recipes"
	WHERE "slug" = '';

	IF offending IS NOT NULL THEN
		RAISE EXCEPTION 'Cannot build a slug from these recipe titles, because they hold no letters or numbers: %. Rename them and run the migration again.', offending;
	END IF;

	SELECT string_agg(format('%s (id %s)', "title", "id"), ', ' ORDER BY "id")
	INTO offending
	FROM "recipes"
	WHERE "slug" = 'new';

	IF offending IS NOT NULL THEN
		RAISE EXCEPTION 'These recipe titles give the slug "new", which is already the address of the new recipe page: %. Rename them and run the migration again.', offending;
	END IF;

	SELECT string_agg(detail, '; ' ORDER BY detail)
	INTO offending
	FROM (
		SELECT format('%s shared by %s', "slug", string_agg("title", ' and ' ORDER BY "id")) AS detail
		FROM "recipes"
		GROUP BY "slug"
		HAVING count(*) > 1
	) AS clashes;

	IF offending IS NOT NULL THEN
		RAISE EXCEPTION 'These recipe titles give the same slug: %. Rename one of each pair and run the migration again.', offending;
	END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "recipes" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_slug_idx" ON "recipes" USING btree ("slug");--> statement-breakpoint
-- A recipe that existed before this migration has only ever held one slug.
INSERT INTO "recipe_slugs" ("slug", "recipe_id") SELECT "slug", "id" FROM "recipes";
