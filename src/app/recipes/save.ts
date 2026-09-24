import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { ingredients, recipeSlugs, recipes, type Recipe } from "@/db/schema";
import { checkWriteAccess, WRITE_PASSWORD_MISSING } from "@/lib/auth";
import { replaceTags } from "@/lib/recipe-tags";
import { RESERVED_SLUGS } from "@/lib/slug";
import { removeImage, type StoredImage } from "@/lib/storage";
import type { RecipeInput } from "@/lib/validation";

/**
 * Everything both ways of making a recipe share: the password check, the slug
 * rules and the write itself. The form and the AI page differ only in where
 * the recipe came from, so neither of them owns this code.
 */

/** The field an error belongs to, so the form can point at it. */
export type RecipeFormError = { field: string | null; message: string };
export type RecipeFormState = { errors: RecipeFormError[] };

export type ImageChange = StoredImage | { imageUrl: null; imagePathname: null };

/**
 * The proxy covers the write pages, but a server function is a POST to the
 * page that holds it, so the delete action arrives on the public recipe page.
 * Every action checks for itself rather than trusting the matcher.
 */
export async function requireWriteAccess() {
  const access = checkWriteAccess((await headers()).get("authorization"));

  if (access === "unconfigured") throw new Error(WRITE_PASSWORD_MISSING);
  // Nothing prompts here. Refusing before anything is read or written is all
  // this has to do.
  if (access === "denied") throw new Error("A password is needed to change a recipe.");
}

/**
 * Why the title cannot be used as an address, or null when it can be. Titles
 * are unique by their slug, so "Chocolate cake" and "Chocolate Cake!" clash.
 */
export async function checkSlug(slug: string, recipeId: number | null) {
  if (slug === "") {
    return "Title must hold at least one letter or number, because the web address is built from it";
  }

  if (RESERVED_SLUGS.has(slug)) {
    return `Title cannot be used, because "/recipes/${slug}" is already a page on this site`;
  }

  // Against recipe_slugs rather than recipes, so a slug a rename retired stays
  // taken. A recipe can always take back a slug from its own history.
  const taken = await db.query.recipeSlugs.findFirst({
    where: and(
      eq(recipeSlugs.slug, slug),
      recipeId === null ? undefined : ne(recipeSlugs.recipeId, recipeId),
    ),
  });

  return taken ? `Title is already used by another recipe, at "/recipes/${slug}"` : null;
}

/**
 * Write a checked recipe, and clear the cached pages it appears on. The slug
 * is passed in rather than built here, because the caller has to check it
 * before uploading a photo.
 */
export async function persistRecipe({
  recipe,
  slug,
  existing = null,
  image = null,
}: {
  recipe: RecipeInput;
  slug: string;
  existing?: Recipe | null;
  image?: ImageChange | null;
}) {
  await db.transaction(async (tx) => {
    const values = {
      title: recipe.title,
      slug,
      description: recipe.description,
      category: recipe.category,
      cuisine: recipe.cuisine,
      servings: recipe.servings,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      instructions: recipe.instructions,
      updatedAt: new Date(),
      ...(image ?? {}),
    };

    let recipeId: number;

    if (existing) {
      await tx.update(recipes).set(values).where(eq(recipes.id, existing.id));
      // The form always submits the whole list, so the rows are replaced
      // wholesale rather than diffed row by row.
      await tx.delete(ingredients).where(eq(ingredients.recipeId, existing.id));
      recipeId = existing.id;
    } else {
      const [created] = await tx.insert(recipes).values(values).returning({ id: recipes.id });
      recipeId = created.id;
    }

    // A rename keeps the old slug here, which is what redirects the old
    // address. Renaming back to an earlier title finds its row already there.
    await tx.insert(recipeSlugs).values({ slug, recipeId }).onConflictDoNothing();

    await replaceTags(tx, recipeId, recipe.tags);

    if (recipe.ingredients.length > 0) {
      await tx.insert(ingredients).values(
        recipe.ingredients.map((ingredient, index) => ({
          recipeId,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          position: index + 1,
        })),
      );
    }
  });

  // Only once the row is safely saved, or a failed update would lose the photo.
  if (image && existing?.imagePathname) {
    await removeImage(existing.imagePathname);
  }

  revalidatePath("/");
  revalidatePath(`/recipes/${slug}`);
  // A rename leaves the old address redirecting, so its cached page has to go.
  if (existing && existing.slug !== slug) revalidatePath(`/recipes/${existing.slug}`);
}
