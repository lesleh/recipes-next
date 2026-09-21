"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { saveRecipe, type RecipeFormState } from "@/app/recipes/actions";
import type { RecipeWithIngredients } from "@/db/schema";
import { IMAGE_CONTENT_TYPES } from "@/lib/validation";

type IngredientRow = { key: string; quantity: string; unit: string; name: string };

const blankRow = (): IngredientRow => ({
  key: crypto.randomUUID(),
  quantity: "",
  unit: "",
  name: "",
});

function initialRows(recipe?: RecipeWithIngredients): IngredientRow[] {
  if (!recipe || recipe.ingredients.length === 0) return [blankRow()];

  return recipe.ingredients.map((ingredient) => ({
    key: String(ingredient.id),
    quantity: ingredient.quantity ?? "",
    unit: ingredient.unit ?? "",
    name: ingredient.name,
  }));
}

export function RecipeForm({ recipe }: { recipe?: RecipeWithIngredients }) {
  const [state, formAction, pending] = useActionState<RecipeFormState, FormData>(saveRecipe, {
    errors: [],
  });

  // Controlled, because React resets an uncontrolled form once the action
  // returns, which would wipe the fields on a validation error.
  const [values, setValues] = useState({
    title: recipe?.title ?? "",
    description: recipe?.description ?? "",
    servings: recipe?.servings?.toString() ?? "",
    prepTimeMinutes: recipe?.prepTimeMinutes?.toString() ?? "",
    cookTimeMinutes: recipe?.cookTimeMinutes?.toString() ?? "",
    instructions: recipe?.instructions ?? "",
  });
  const [rows, setRows] = useState(() => initialRows(recipe));

  const setValue = (field: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const updateRow = (key: string, field: keyof Omit<IngredientRow, "key">, value: string) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );

  const removeRow = (key: string) =>
    setRows((current) => {
      const remaining = current.filter((row) => row.key !== key);
      return remaining.length > 0 ? remaining : [blankRow()];
    });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}
      <input
        type="hidden"
        name="ingredients"
        value={JSON.stringify(
          rows.map(({ quantity, unit, name }) => ({ quantity, unit, name })),
        )}
      />

      {state.errors.length > 0 && (
        <div className="border-danger/40 bg-danger/5 text-danger rounded-lg border p-4">
          <h2 className="mt-0 text-base">
            {state.errors.length === 1
              ? "1 error stopped this recipe being saved:"
              : `${state.errors.length} errors stopped this recipe being saved:`}
          </h2>
          <ul className="list-disc pl-5">
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          required
          value={values.title}
          onChange={(event) => setValue("title")(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={values.description}
          onChange={(event) => setValue("description")(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="image">Photo</label>
        <input
          id="image"
          type="file"
          name="image"
          accept={IMAGE_CONTENT_TYPES.join(",")}
          className="file:button file:mr-3"
        />

        {recipe?.imageUrl && (
          <div className="mt-2 flex items-center gap-3">
            <Image
              src={recipe.imageUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="removeImage" className="w-auto" />
              Remove the current photo
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="servings">Servings</label>
          <input
            id="servings"
            name="servings"
            type="number"
            min={1}
            value={values.servings}
            onChange={(event) => setValue("servings")(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="prepTimeMinutes">Prep time (minutes)</label>
          <input
            id="prepTimeMinutes"
            name="prepTimeMinutes"
            type="number"
            min={1}
            value={values.prepTimeMinutes}
            onChange={(event) => setValue("prepTimeMinutes")(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="cookTimeMinutes">Cook time (minutes)</label>
          <input
            id="cookTimeMinutes"
            name="cookTimeMinutes"
            type="number"
            min={1}
            value={values.cookTimeMinutes}
            onChange={(event) => setValue("cookTimeMinutes")(event.target.value)}
          />
        </div>
      </div>

      <fieldset className="border-line rounded-xl border p-4">
        <legend className="text-ink-soft px-1 text-sm font-medium">Ingredients</legend>

        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Quantity"
                placeholder="200"
                className="w-20"
                value={row.quantity}
                onChange={(event) => updateRow(row.key, "quantity", event.target.value)}
              />
              <input
                aria-label="Unit"
                placeholder="g"
                className="w-20"
                value={row.unit}
                onChange={(event) => updateRow(row.key, "unit", event.target.value)}
              />
              <input
                aria-label="Ingredient"
                placeholder="Plain flour"
                className="min-w-40 flex-1"
                value={row.name}
                onChange={(event) => updateRow(row.key, "name", event.target.value)}
              />
              <button
                type="button"
                className="button button--quiet"
                onClick={() => removeRow(row.key)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="button button--quiet mt-3"
          onClick={() => setRows((current) => [...current, blankRow()])}
        >
          Add ingredient
        </button>
      </fieldset>

      <div className="field">
        <label htmlFor="instructions">Method (one step per line)</label>
        <textarea
          id="instructions"
          name="instructions"
          rows={10}
          value={values.instructions}
          onChange={(event) => setValue("instructions")(event.target.value)}
        />
      </div>

      <div>
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? "Saving..." : recipe ? "Update recipe" : "Create recipe"}
        </button>
      </div>
    </form>
  );
}
