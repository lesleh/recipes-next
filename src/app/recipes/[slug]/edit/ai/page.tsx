import Link from "next/link";

import { AiRecipeEditForm } from "@/components/ai-recipe-edit-form";
import { fromSavedRecipe, GATEWAY_KEY_MISSING } from "@/lib/recipe-writer";
import { findRecipeBySlug } from "@/lib/recipes";

import { loadRecipeBySlug } from "../../load";

type PageProps = { params: Promise<{ slug: string }> };

/** A change writes the whole recipe again, which takes tens of seconds. */
export const maxDuration = 120;

/**
 * The key is read on every request, for the reason the page that writes a new
 * recipe gives: adding a variable in Vercel does not deploy anything.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await findRecipeBySlug(slug);

  return { title: recipe ? `Edit ${recipe.title} with AI` : "Edit a recipe with AI" };
}

export default async function AiEditRecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await loadRecipeBySlug(slug, "/edit/ai");
  const configured = Boolean(process.env.AI_GATEWAY_API_KEY);
  const editHref = `/recipes/${recipe.slug}/edit`;

  return (
    <div className="page">
      <h1>Edit with AI</h1>
      <p className="text-ink-soft mt-2">
        Say what should change, read the draft, and ask for more changes until it is right. Nothing
        is saved until you press save, and the photo and the illustration stay as they are. Or{" "}
        <Link href={editHref}>edit it yourself</Link>.
      </p>

      <div className="mt-6">
        {configured ? (
          <AiRecipeEditForm id={recipe.id} slug={recipe.slug} saved={fromSavedRecipe(recipe)} />
        ) : (
          <div className="border-danger bg-danger-soft rounded-surface border-l-4 px-5 py-4">
            <h2 className="text-danger">This page is not set up yet</h2>
            <p className="text-danger mt-2">{GATEWAY_KEY_MISSING}</p>
            <p className="mt-2">
              <Link href={editHref}>Edit the recipe yourself instead</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
