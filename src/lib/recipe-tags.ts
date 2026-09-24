import { eq, inArray, notExists, sql } from "drizzle-orm";

import { db } from "@/db";
import { recipeTags, tags } from "@/db/schema";

import { slugify } from "./slug";

type Database = typeof db;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Connection = Database | Transaction;

/**
 * Remove every tag no recipe carries any more. A tag belongs to nobody, so
 * nothing else would ever delete one, and the sidebar must never offer a tag
 * that leads to an empty list.
 */
export async function deleteOrphanTags(connection: Connection) {
  await connection.delete(tags).where(
    notExists(
      db
        .select({ found: sql`1` })
        .from(recipeTags)
        .where(eq(recipeTags.tagId, tags.id)),
    ),
  );
}

/**
 * Replace a recipe's tags with the names given, creating any tag that is new.
 * A tag already stored keeps the name it was first given, because the insert
 * does nothing on a slug it already holds.
 */
export async function replaceTags(connection: Connection, recipeId: number, names: string[]) {
  await connection.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId));

  if (names.length > 0) {
    const rows = names.map((name) => ({ name, slug: slugify(name) }));

    await connection.insert(tags).values(rows).onConflictDoNothing();

    // Read back rather than trusting what the insert returned, because a tag
    // that already existed returns nothing at all.
    const stored = await connection
      .select({ id: tags.id })
      .from(tags)
      .where(
        inArray(
          tags.slug,
          rows.map((row) => row.slug),
        ),
      );

    await connection.insert(recipeTags).values(stored.map(({ id }) => ({ recipeId, tagId: id })));
  }

  await deleteOrphanTags(connection);
}
