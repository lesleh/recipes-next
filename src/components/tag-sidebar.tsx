import Link from "next/link";

import type { TagWithCount } from "@/lib/recipes";
import { tagHref } from "@/lib/tags";

/**
 * Every tag in use, with how many recipes carry it. A list of links and
 * nothing else, so it needs no JavaScript, and it moves below the recipe list
 * on a narrow screen.
 */
export function TagSidebar({
  tags,
  chosen,
  query,
}: {
  tags: TagWithCount[];
  chosen: string;
  query: string;
}) {
  return (
    <nav aria-labelledby="tags-heading" className="lg:sticky lg:top-6 lg:self-start">
      <h2 id="tags-heading" className="text-xl">
        Tags
      </h2>

      <ul className="border-line mt-3 m-0 list-none border-t p-0">
        {tags.map((tag) => (
          <li key={tag.slug} className="border-line border-b">
            <Link
              href={tagHref(tag.slug, query)}
              aria-current={tag.slug === chosen ? true : undefined}
              className="tag-row"
            >
              <span className="tag-row__name">{tag.name}</span>
              <span className="tag-row__count">{tag.recipeCount}</span>
            </Link>
          </li>
        ))}
      </ul>

      {chosen && (
        <Link href={tagHref(null, query)} className="button button--quiet mt-3">
          Clear tag
        </Link>
      )}
    </nav>
  );
}
