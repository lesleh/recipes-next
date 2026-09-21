import Image from "next/image";
import Link from "next/link";

import type { RecipeListItem } from "@/lib/recipes";
import { pluralize, totalTimeMinutes, truncate } from "@/lib/format";

export function RecipeCard({ recipe }: { recipe: RecipeListItem }) {
  const totalTime = totalTimeMinutes(recipe);

  return (
    <li className="border-line bg-card flex gap-4 rounded-xl border p-4">
      {recipe.imageUrl && (
        <Link href={`/recipes/${recipe.slug}`} className="shrink-0">
          <Image
            src={recipe.imageUrl}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 rounded-lg object-cover"
          />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <h2 className="mt-0 mb-1 text-base font-semibold">
          <Link href={`/recipes/${recipe.slug}`} className="text-ink no-underline hover:underline">
            {recipe.title}
          </Link>
        </h2>

        {recipe.description && (
          <p className="text-ink-soft mb-2 text-sm">{truncate(recipe.description, 160)}</p>
        )}

        <p className="meta">
          {totalTime !== null && <span>{totalTime} min total</span>}
          {recipe.servings !== null && <span>Serves {recipe.servings}</span>}
          <span>{pluralize(recipe.ingredients.length, "ingredient")}</span>
        </p>
      </div>
    </li>
  );
}
