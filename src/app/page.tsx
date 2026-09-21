import Link from "next/link";

import { RecipeCard } from "@/components/recipe-card";
import { listRecipes } from "@/lib/recipes";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const recipes = await listRecipes(query);

  return (
    <>
      <h1>Recipes</h1>

      <form action="/" method="get" className="mb-6 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search recipes"
          placeholder="Search by name, description or ingredient"
          className="min-w-60 flex-1"
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
        <ul className="flex list-none flex-col gap-3 p-0">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </ul>
      ) : (
        <p className="empty">
          {query ? (
            <>No recipes match &ldquo;{query}&rdquo;.</>
          ) : (
            <>
              No recipes yet. <Link href="/recipes/new">Add the first one</Link>.
            </>
          )}
        </p>
      )}
    </>
  );
}
