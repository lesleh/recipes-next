import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { ingredientLabel, instructionSteps } from "@/lib/format";
import { findRecipe } from "@/lib/recipes";

type PageProps = { params: Promise<{ id: string }> };

async function loadRecipe(params: PageProps["params"]) {
  const { id } = await params;
  const recipe = Number.isInteger(Number(id)) ? await findRecipe(Number(id)) : undefined;

  if (!recipe) notFound();

  return recipe;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const recipe = Number.isInteger(Number(id)) ? await findRecipe(Number(id)) : undefined;

  return { title: recipe?.title ?? "Recipe" };
}

export default async function RecipePage({ params }: PageProps) {
  const recipe = await loadRecipe(params);
  const steps = instructionSteps(recipe.instructions);

  return (
    <article>
      <h1>{recipe.title}</h1>

      {recipe.imageUrl && (
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          width={1200}
          height={800}
          priority
          className="border-line mb-4 w-full rounded-xl border object-cover"
        />
      )}

      {recipe.description && <p className="text-ink-soft mb-3">{recipe.description}</p>}

      <p className="meta">
        {recipe.prepTimeMinutes !== null && <span>Prep {recipe.prepTimeMinutes} min</span>}
        {recipe.cookTimeMinutes !== null && <span>Cook {recipe.cookTimeMinutes} min</span>}
        {recipe.servings !== null && <span>Serves {recipe.servings}</span>}
      </p>

      <section>
        <h2>Ingredients</h2>
        {recipe.ingredients.length > 0 ? (
          <ul className="marker:text-ink-soft list-disc pl-5">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id}>{ingredientLabel(ingredient)}</li>
            ))}
          </ul>
        ) : (
          <p className="empty">No ingredients listed.</p>
        )}
      </section>

      <section>
        <h2>Method</h2>
        {steps.length > 0 ? (
          <ol className="marker:text-ink-soft flex list-decimal flex-col gap-2 pl-5">
            {steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="empty">No method written yet.</p>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link href={`/recipes/${recipe.id}/edit`} className="button">
          Edit
        </Link>
        <DeleteRecipeButton id={recipe.id} title={recipe.title} />
        <Link href="/" className="button button--quiet">
          Back to recipes
        </Link>
      </div>
    </article>
  );
}
