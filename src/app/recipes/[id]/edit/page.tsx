import Link from "next/link";
import { notFound } from "next/navigation";

import { RecipeForm } from "@/components/recipe-form";
import { findRecipe } from "@/lib/recipes";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const recipe = Number.isInteger(Number(id)) ? await findRecipe(Number(id)) : undefined;

  return { title: recipe ? `Edit ${recipe.title}` : "Edit recipe" };
}

export default async function EditRecipePage({ params }: PageProps) {
  const { id } = await params;
  const recipe = Number.isInteger(Number(id)) ? await findRecipe(Number(id)) : undefined;

  if (!recipe) notFound();

  return (
    <>
      <h1>Edit recipe</h1>
      <RecipeForm recipe={recipe} />
      <Link href={`/recipes/${recipe.id}`} className="button button--quiet mt-6">
        Back to recipe
      </Link>
    </>
  );
}
