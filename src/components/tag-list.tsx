import Link from "next/link";

import type { Tag } from "@/db/schema";
import { tagHref } from "@/lib/tags";

/**
 * The tags a recipe carries, each one a link to the list filtered by it. The
 * list wraps, so ten long tags make the card taller rather than wider.
 */
export function TagList({ tags, label }: { tags: Pick<Tag, "name" | "slug">[]; label: string }) {
  if (tags.length === 0) return null;

  return (
    <ul aria-label={label} className="tag-list">
      {tags.map((tag) => (
        <li key={tag.slug}>
          {/* Above the card's own overlay link, which otherwise covers the
              whole row and would swallow the tap. */}
          <Link href={tagHref(tag.slug)} className="tag relative">
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
