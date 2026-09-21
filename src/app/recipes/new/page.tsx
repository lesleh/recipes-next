import { RecipeForm } from "@/components/recipe-form";

export const metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <div className="page">
      <h1>New recipe</h1>
      <div className="mt-6">
        <RecipeForm backHref="/" backLabel="Back to recipes" />
      </div>
    </div>
  );
}
