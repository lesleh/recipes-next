import type { Metadata } from "next";
import Link from "next/link";

import { RecipeCard } from "@/components/recipe-card";
import { TagSidebar } from "@/components/tag-sidebar";
import { findTagName, listRecipes, listTags } from "@/lib/recipes";
import { tagHref } from "@/lib/tags";

type PageProps = { searchParams: Promise<{ q?: string; tag?: string }> };

/**
 * A search is the recipe list filtered, not a page of its own, so it is kept
 * out of the index. Otherwise every term anyone searches for becomes another
 * address holding the same title and description as the list. It keeps
 * `follow`, so a crawler still reads the recipes it links to, and carries no
 * canonical, because a canonical pointing somewhere else alongside `noindex`
 * is a contradiction Google warns against.
 *
 * A tag is different. There is a fixed set of them, each one a subject a
 * reader could search for, so a tag is a page worth indexing under its own
 * address. A tag no recipe carries is not: the page would be empty, so it is
 * treated like a search.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q, tag } = await searchParams;
  const query = q?.trim() ?? "";
  const chosen = tag?.trim() ?? "";

  if (query) {
    const title = chosen ? `Search: ${query} in ${chosen}` : `Search: ${query}`;

    return { title, robots: { index: false, follow: true } };
  }

  if (chosen) {
    const name = await findTagName(chosen);

    if (!name) return { title: `Tag: ${chosen}`, robots: { index: false, follow: true } };

    return {
      title: `${name} recipes`,
      description: `Every recipe tagged ${name}.`,
      alternates: { canonical: tagHref(chosen) },
    };
  }

  return { alternates: { canonical: "/" } };
}

/** Why the list is empty, in the terms the reader filtered it by. */
function emptyMessage(query: string, chosen: string) {
  if (query && chosen) return `No recipes with this tag match "${query}".`;
  if (query) return `No recipes match "${query}".`;

  return "No recipes carry this tag.";
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const { q, tag } = await searchParams;
  const query = q?.trim() ?? "";
  const chosen = tag?.trim() ?? "";

  const [recipes, tags] = await Promise.all([listRecipes({ query, tag: chosen }), listTags()]);

  // No tags anywhere means no sidebar, and no reason for the wider page it
  // would sit in.
  const hasSidebar = tags.length > 0;

  return (
    <div className={hasSidebar ? "page page--wide" : "page"}>
      <h1>Recipes</h1>

      <div className="mt-5 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div>
          <form action="/" method="get" className="mb-2 flex flex-wrap gap-2">
            {/* Without this, searching inside a tag would silently drop it. */}
            {chosen && <input type="hidden" name="tag" value={chosen} />}
            <input
              type="search"
              name="q"
              defaultValue={query}
              aria-label="Search recipes"
              placeholder="Search by name, description or ingredient"
              className="min-w-50 flex-1"
            />
            <button type="submit" className="button">
              Search
            </button>
            {query && (
              <Link href={tagHref(chosen || null)} className="button button--quiet">
                Clear
              </Link>
            )}
          </form>

          {recipes.length > 0 ? (
            <ul className="border-line m-0 list-none border-t p-0">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </ul>
          ) : (
            <p className="empty mt-4">
              {query || chosen ? (
                <>
                  {emptyMessage(query, chosen)} <Link href="/">Show all recipes</Link>.
                </>
              ) : (
                <>
                  No recipes yet. <Link href="/recipes/new">Add the first one</Link>.
                </>
              )}
            </p>
          )}
        </div>

        {hasSidebar && <TagSidebar tags={tags} chosen={chosen} query={query} />}
      </div>
    </div>
  );
}
