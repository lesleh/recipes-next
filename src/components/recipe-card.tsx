import Image from "next/image";
import Link from "next/link";

import type { RecipeListItem } from "@/lib/recipes";
import { pluralize, totalTimeMinutes, truncate } from "@/lib/format";

export function RecipeCard({ recipe }: { recipe: RecipeListItem }) {
  const totalTime = totalTimeMinutes(recipe);

  return (
    <li className="border-line border-b">
      {/* The whole row is the link, so the tap target is the row rather than
          the title. A recipe with no photo keeps the same row. */}
      <article className="relative flex gap-4 py-4 sm:gap-5 sm:py-5">
        {recipe.imageUrl && (
          <Image
            src={recipe.imageUrl}
            alt=""
            width={320}
            height={240}
            sizes="(min-width: 640px) 160px, 96px"
            className="rounded-surface h-18 w-24 shrink-0 object-cover sm:h-30 sm:w-40"
          />
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">
            <Link
              href={`/recipes/${recipe.slug}`}
              className="text-ink no-underline after:absolute after:inset-0 hover:underline"
            >
              {recipe.title}
            </Link>
          </h2>

          {recipe.description && (
            <p className="text-ink-soft mt-1 text-base">{truncate(recipe.description, 140)}</p>
          )}

          <p className="meta mt-2">
            {totalTime !== null && (
              <span>
                <strong>{totalTime}</strong> min
              </span>
            )}
            {recipe.servings !== null && (
              <span>
                Serves <strong>{recipe.servings}</strong>
              </span>
            )}
            <span>{pluralize(recipe.ingredients.length, "ingredient")}</span>
          </p>

          {/* #14 adds the tag links below the meta row, where they wrap. */}
        </div>
      </article>
    </li>
  );
}
