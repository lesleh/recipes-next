import Image from "next/image";
import Link from "next/link";

import { TagList } from "@/components/tag-list";
import type { RecipeListItem } from "@/lib/recipes";
import { pluralize, totalTimeMinutes, truncate } from "@/lib/format";

export function RecipeCard({ recipe }: { recipe: RecipeListItem }) {
  const totalTime = totalTimeMinutes(recipe);

  return (
    <li className="border-line border-b">
      {/* The whole row is the link, so the tap target is the row rather than
          the title. A recipe with no photo gets a placeholder of the same
          size, so every title starts at the same place. */}
      <article className="relative flex gap-4 py-4 sm:gap-5 sm:py-5">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt=""
            width={320}
            height={240}
            sizes="(min-width: 640px) 160px, 96px"
            className="rounded-surface h-18 w-24 shrink-0 object-cover sm:h-30 sm:w-40"
          />
        ) : (
          <div className="rounded-surface bg-paper text-line-strong flex h-18 w-24 shrink-0 items-center justify-center sm:h-30 sm:w-40">
            {/* A plate with a knife and fork. Decorative, like the photo. */}
            <svg
              viewBox="0 0 48 32"
              className="w-12 sm:w-16"
              aria-hidden="true"
              focusable="false"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="24" cy="16" r="11" />
              <circle cx="24" cy="16" r="7" />
              <path d="M6 5v7a2 2 0 0 0 2 2v13M8 5v7M10 5v7a2 2 0 0 1-2 2" />
              <path d="M42 27V5c-2 2-3 5-3 9h3" />
            </svg>
          </div>
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
            <p className="text-ink mt-1 text-base">{truncate(recipe.description, 140)}</p>
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

          {recipe.tags.length > 0 && (
            <div className="mt-2">
              <TagList tags={recipe.tags} label={`Tags for ${recipe.title}`} />
            </div>
          )}
        </div>
      </article>
    </li>
  );
}
