import { IllustrationPanel } from "@/components/illustration-panel";
import { RecipeForm } from "@/components/recipe-form";
import { readIllustration } from "@/lib/illustration";
import { findRecipeBySlug } from "@/lib/recipes";

import { loadRecipeBySlug } from "../load";

type PageProps = { params: Promise<{ slug: string }> };

/** A drawing takes about half a minute, and a refused one is asked for twice. */
export const maxDuration = 120;

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await findRecipeBySlug(slug);

  return { title: recipe ? `Edit ${recipe.title}` : "Edit recipe" };
}

export default async function EditRecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await loadRecipeBySlug(slug, "/edit");

  return (
    <div className="page">
      <h1>Edit recipe</h1>
      <div className="mt-6">
        <IllustrationPanel
          id={recipe.id}
          slug={recipe.slug}
          illustration={readIllustration(recipe.illustration)}
        />
      </div>
      <div className="mt-6">
        <RecipeForm
          recipe={recipe}
          backHref={`/recipes/${recipe.slug}`}
          backLabel="Back to recipe"
        />
      </div>
    </div>
  );
}
