import type { Metadata } from "next";
import Link from "next/link";

import { RecipeCard } from "@/components/recipe-card";
import { listRecipes } from "@/lib/recipes";

type PageProps = { searchParams: Promise<{ q?: string }> };

/**
 * A search is the recipe list filtered, not a page of its own, so it is kept
 * out of the index. Otherwise every term anyone searches for becomes another
 * address holding the same title and description as the list.
 *
 * The search keeps `follow`, so a crawler still reads the recipes it links to,
 * and carries no canonical, because a canonical pointing somewhere else
 * alongside `noindex` is a contradiction Google warns against.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (query) {
    return { title: `Search: ${query}`, robots: { index: false, follow: true } };
  }

  return { alternates: { canonical: "/" } };
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const recipes = await listRecipes(query);

  return (
    // #14 swaps this for "page page--wide" and puts the tag sidebar in a
    // second column. The list column keeps the width it has here.
    <div className="page">
      <h1>Recipes</h1>

      <form action="/" method="get" className="mt-5 mb-2 flex flex-wrap gap-2">
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
          <Link href="/" className="button button--quiet">
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
          {query ? (
            <>No recipes match &ldquo;{query}&rdquo;.</>
          ) : (
            <>
              No recipes yet. <Link href="/recipes/new">Add the first one</Link>.
            </>
          )}
        </p>
      )}
    </div>
  );
}
