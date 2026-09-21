"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { ingredients, recipeSlugs, recipes } from "@/db/schema";
import { RESERVED_SLUGS, slugify } from "@/lib/slug";
import { removeImage, storeImage, type StoredImage } from "@/lib/storage";
import { recipeSchema, validateImage } from "@/lib/validation";

export type RecipeFormState = { errors: string[] };

type ImageChange = StoredImage | { imageUrl: null; imagePathname: null };

function parseIngredients(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim() === "") return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Why the title cannot be used as an address, or null when it can be. Titles
 * are unique by their slug, so "Chocolate cake" and "Chocolate Cake!" clash.
 */
async function checkSlug(slug: string, recipeId: number | null) {
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

export async function saveRecipe(
  _previousState: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const idValue = text(formData, "id");
  const id = idValue ? Number(idValue) : null;

  // Blank rows are dropped rather than rejected, as the Rails form did.
  const submittedIngredients = parseIngredients(formData.get("ingredients")).filter(
    (row: { name?: unknown }) => typeof row?.name === "string" && row.name.trim() !== "",
  );

  const parsed = recipeSchema.safeParse({
    title: text(formData, "title"),
    description: text(formData, "description"),
    servings: text(formData, "servings"),
    prepTimeMinutes: text(formData, "prepTimeMinutes"),
    cookTimeMinutes: text(formData, "cookTimeMinutes"),
    instructions: text(formData, "instructions"),
    ingredients: submittedIngredients,
  });

  const upload = formData.get("image");
  const hasUpload = upload instanceof File && upload.size > 0;
  const imageError = hasUpload ? validateImage(upload) : null;

  if (!parsed.success || imageError) {
    const issues = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);

    return { errors: [...issues, imageError].filter((message): message is string => Boolean(message)) };
  }

  const recipe = parsed.data;
  const existing = id ? await db.query.recipes.findFirst({ where: eq(recipes.id, id) }) : null;

  if (id && !existing) redirect("/");

  // Checked before the photo is uploaded, so a refused save leaves no orphan
  // file behind. The primary key on recipe_slugs is the backstop if two saves
  // race each other.
  const slug = slugify(recipe.title);
  const slugError = await checkSlug(slug, existing?.id ?? null);

  if (slugError) return { errors: [slugError] };

  // An upload beats the remove checkbox, so a stale tick cannot discard the
  // file the user just chose.
  const shouldRemove = text(formData, "removeImage") === "on" && !hasUpload;
  let image: ImageChange | null = null;

  if (hasUpload) {
    image = await storeImage(upload, upload.name, upload.type);
  } else if (shouldRemove) {
    image = { imageUrl: null, imagePathname: null };
  }

  await db.transaction(async (tx) => {
    const values = {
      title: recipe.title,
      slug,
      description: recipe.description,
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

  redirect(`/recipes/${slug}`);
}

export async function deleteRecipe(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/");

  const existing = await db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  if (!existing) redirect("/");

  // Read before the delete, because the cascade clears them with the recipe.
  // Every slug it held, current and retired, is free again afterwards.
  const freed = await db
    .select({ slug: recipeSlugs.slug })
    .from(recipeSlugs)
    .where(eq(recipeSlugs.recipeId, id));

  await db.delete(recipes).where(eq(recipes.id, id));

  if (existing.imagePathname) {
    await removeImage(existing.imagePathname);
  }

  revalidatePath("/");

  for (const { slug } of freed) {
    revalidatePath(`/recipes/${slug}`);
  }

  redirect("/");
}
