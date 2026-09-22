"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { recipeSlugs, recipes } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { removeImage, storeImage } from "@/lib/storage";
import { recipeSchema, validateImage } from "@/lib/validation";

import {
  checkSlug,
  persistRecipe,
  requireWriteAccess,
  type ImageChange,
  type RecipeFormError,
  type RecipeFormState,
} from "./save";

export type { RecipeFormError, RecipeFormState } from "./save";

/** Field ids on the form. A row error points at the ingredients fieldset. */
const FORM_FIELDS = new Set([
  "title",
  "description",
  "servings",
  "prepTimeMinutes",
  "cookTimeMinutes",
  "instructions",
  "ingredients",
  "image",
]);

function fieldFor(path: PropertyKey[]) {
  const first = String(path[0] ?? "");
  return FORM_FIELDS.has(first) ? first : null;
}

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

export async function saveRecipe(
  _previousState: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  await requireWriteAccess();

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
    const issues: RecipeFormError[] = parsed.success
      ? []
      : parsed.error.issues.map((issue) => ({
          field: fieldFor(issue.path),
          message: issue.message,
        }));

    if (imageError) issues.push({ field: "image", message: imageError });

    return { errors: issues };
  }

  const recipe = parsed.data;
  const existing = id ? await db.query.recipes.findFirst({ where: eq(recipes.id, id) }) : null;

  if (id && !existing) redirect("/");

  // Checked before the photo is uploaded, so a refused save leaves no orphan
  // file behind. The primary key on recipe_slugs is the backstop if two saves
  // race each other.
  const slug = slugify(recipe.title);
  const slugError = await checkSlug(slug, existing?.id ?? null);

  if (slugError) return { errors: [{ field: "title", message: slugError }] };

  // An upload beats the remove checkbox, so a stale tick cannot discard the
  // file the user just chose.
  const shouldRemove = text(formData, "removeImage") === "on" && !hasUpload;
  let image: ImageChange | null = null;

  if (hasUpload) {
    image = await storeImage(upload, upload.name, upload.type);
  } else if (shouldRemove) {
    image = { imageUrl: null, imagePathname: null };
  }

  await persistRecipe({ recipe, slug, existing: existing ?? null, image });

  redirect(`/recipes/${slug}`);
}

export async function deleteRecipe(formData: FormData) {
  await requireWriteAccess();

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
