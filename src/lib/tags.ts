import { slugify } from "./slug";

/** A recipe carries at most this many tags. */
export const MAX_TAGS = 10;

/** As long as the shortest text fields on the recipe form. */
export const MAX_TAG_NAME = 50;

/**
 * The tag names in a set of submitted values, in the order they were typed.
 *
 * Every value is split on commas, so one field holding "weeknight, chicken"
 * and two fields holding one name each both arrive here as two names. A name
 * is dropped when it repeats one already read, or when it slugifies to
 * nothing, because the slug is what makes two tags the same tag. Dropping
 * rather than refusing matches the blank ingredient rows the form throws away.
 */
export function parseTags(values: string[]) {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    for (const part of value.split(",")) {
      const name = part.trim();
      const slug = slugify(name);

      if (slug === "" || seen.has(slug)) continue;

      seen.add(slug);
      names.push(name);
    }
  }

  return names;
}

/**
 * Tags in slug order, for `sort`.
 *
 * By slug rather than by name, because a name keeps the case it was typed in
 * and sorting those depends on the database collation, which differs between
 * a local Postgres and production. Slugs are lowercase, so they sort the same
 * everywhere. They are also unique, so this needs no tiebreaker.
 */
export function bySlug(left: { slug: string }, right: { slug: string }) {
  if (left.slug === right.slug) return 0;

  return left.slug < right.slug ? -1 : 1;
}

/** The recipe list filtered by a tag, or by a search inside a tag. */
export function tagHref(slug: string | null, query = "") {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (slug) params.set("tag", slug);

  const search = params.toString();

  return search ? `/?${search}` : "/";
}
