import Link from "next/link";

import { RecipeForm } from "@/components/recipe-form";
import { findRecipeBySlug } from "@/lib/recipes";

import { loadRecipeBySlug } from "../load";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await findRecipeBySlug(slug);

  return { title: recipe ? `Edit ${recipe.title}` : "Edit recipe" };
}

export default async function EditRecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await loadRecipeBySlug(slug, "/edit");

  return (
    <>
      <h1>Edit recipe</h1>
      <RecipeForm recipe={recipe} />
      <Link href={`/recipes/${recipe.slug}`} className="button button--quiet mt-6">
        Back to recipe
      </Link>
    </>
  );
}
