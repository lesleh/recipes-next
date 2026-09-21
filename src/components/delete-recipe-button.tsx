"use client";

import { deleteRecipe } from "@/app/recipes/actions";

export function DeleteRecipeButton({ id, title }: { id: number; title: string }) {
  return (
    <form
      action={deleteRecipe}
      onSubmit={(event) => {
        if (!confirm(`Delete ${title}?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="button button--danger">
        Delete
      </button>
    </form>
  );
}
