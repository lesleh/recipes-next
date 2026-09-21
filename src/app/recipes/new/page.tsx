import Link from "next/link";

import { RecipeForm } from "@/components/recipe-form";

export const metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <>
      <h1>New recipe</h1>
      <RecipeForm />
      <Link href="/" className="button button--quiet mt-6">
        Back to recipes
      </Link>
    </>
  );
}
