import Link from "next/link";

import { RecipeForm } from "@/components/recipe-form";

export const metadata = { title: "New recipe" };

/** Saving draws the recipe's illustration afterwards, inside this limit. */
export const maxDuration = 120;

export default function NewRecipePage() {
  return (
    <div className="page">
      <h1>New recipe</h1>
      <p className="text-ink-soft mt-2">
        Or <Link href="/recipes/new/ai">have AI write one from a sentence</Link>, and edit what it
        gets wrong.
      </p>
      <div className="mt-6">
        <RecipeForm backHref="/" backLabel="Back to recipes" />
      </div>
    </div>
  );
}
