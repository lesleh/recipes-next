"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  saveRecipe,
  type RecipeFormError,
  type RecipeFormState,
} from "@/app/recipes/actions";
import { CopyImagePromptButton } from "@/components/copy-image-prompt-button";
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

function messagesFor(errors: RecipeFormError[], field: string) {
  return errors.filter((error) => error.field === field).map((error) => error.message);
}

function FieldError({ errors, field }: { errors: RecipeFormError[]; field: string }) {
  const messages = messagesFor(errors, field);
  if (messages.length === 0) return null;

  return (
    <p className="field__error" id={`${field}-error`}>
      {messages.join(". ")}
    </p>
  );
}

export function RecipeForm({
  recipe,
  backHref,
  backLabel,
}: {
  recipe?: RecipeWithIngredients;
  backHref: string;
  backLabel: string;
}) {
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

  // A refused save scrolls the reader back to the list of what went wrong.
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.errors.length > 0) summary.current?.focus();
  }, [state]);

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

  /** Marks a field as wrong and points its description at the message below. */
  const invalid = (field: string) =>
    messagesFor(state.errors, field).length > 0
      ? { "aria-invalid": true as const, "aria-describedby": `${field}-error` }
      : {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}
      <input
        type="hidden"
        name="ingredients"
        value={JSON.stringify(rows.map(({ quantity, unit, name }) => ({ quantity, unit, name })))}
      />

      {state.errors.length > 0 && (
        <div
          ref={summary}
          tabIndex={-1}
          role="alert"
          className="border-danger bg-danger-soft rounded-surface border-l-4 px-5 py-4"
        >
          <h2 className="text-danger">
            {state.errors.length === 1
              ? "1 error stopped this recipe being saved"
              : `${state.errors.length} errors stopped this recipe being saved`}
          </h2>
          <ul className="mt-2 list-disc pl-5">
            {state.errors.map((error) => (
              <li key={`${error.field}-${error.message}`} className="text-danger">
                {error.field ? (
                  <a href={`#${error.field}`} className="text-danger">
                    {error.message}
                  </a>
                ) : (
                  error.message
                )}
              </li>
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
          {...invalid("title")}
        />
        <FieldError errors={state.errors} field="title" />
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={values.description}
          onChange={(event) => setValue("description")(event.target.value)}
          {...invalid("description")}
        />
        <FieldError errors={state.errors} field="description" />
      </div>

      <div className="field">
        <label htmlFor="image">Photo</label>
        <input
          id="image"
          type="file"
          name="image"
          accept={IMAGE_CONTENT_TYPES.join(",")}
          className="file:border-line-strong file:rounded-control file:text-ink file:bg-paper file:mr-3 file:cursor-pointer file:border file:px-4 file:py-2 file:text-base file:font-bold"
          {...invalid("image")}
        />
        <p className="field__hint">JPEG, PNG or WebP, up to 4MB.</p>
        <FieldError errors={state.errors} field="image" />

        {/* Copies the recipe as saved, not what is typed above, because the
            photo is generated from a recipe that exists. */}
        {recipe && (
          <div className="mt-2">
            <CopyImagePromptButton recipe={recipe} />
            <p className="field__hint mt-2">
              Paste it into Gemini to generate a photo in the same style as the others.
            </p>
          </div>
        )}

        {recipe?.imageUrl && (
          <div className="mt-2 flex items-center gap-4">
            <Image
              src={recipe.imageUrl}
              alt=""
              width={192}
              height={144}
              sizes="96px"
              className="rounded-surface h-18 w-24 shrink-0 object-cover"
            />
            <label className="flex min-h-11 items-center gap-3 text-base">
              <input type="checkbox" name="removeImage" />
              Remove the current photo
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="servings">Servings</label>
          <input
            id="servings"
            name="servings"
            type="number"
            min={1}
            inputMode="numeric"
            value={values.servings}
            onChange={(event) => setValue("servings")(event.target.value)}
            {...invalid("servings")}
          />
          <FieldError errors={state.errors} field="servings" />
        </div>

        <div className="field">
          <label htmlFor="prepTimeMinutes">Prep time (minutes)</label>
          <input
            id="prepTimeMinutes"
            name="prepTimeMinutes"
            type="number"
            min={1}
            inputMode="numeric"
            value={values.prepTimeMinutes}
            onChange={(event) => setValue("prepTimeMinutes")(event.target.value)}
            {...invalid("prepTimeMinutes")}
          />
          <FieldError errors={state.errors} field="prepTimeMinutes" />
        </div>

        <div className="field">
          <label htmlFor="cookTimeMinutes">Cook time (minutes)</label>
          <input
            id="cookTimeMinutes"
            name="cookTimeMinutes"
            type="number"
            min={1}
            inputMode="numeric"
            value={values.cookTimeMinutes}
            onChange={(event) => setValue("cookTimeMinutes")(event.target.value)}
            {...invalid("cookTimeMinutes")}
          />
          <FieldError errors={state.errors} field="cookTimeMinutes" />
        </div>
      </div>

      <fieldset id="ingredients" tabIndex={-1} className="panel" {...invalid("ingredients")}>
        <legend className="field__legend">Ingredients</legend>
        <FieldError errors={state.errors} field="ingredients" />

        <div className="mt-2 flex flex-col gap-3">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className="border-line grid grid-cols-2 gap-2 border-b pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[6rem_6rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <input
                aria-label={`Quantity for ingredient ${index + 1}`}
                placeholder="200"
                value={row.quantity}
                onChange={(event) => updateRow(row.key, "quantity", event.target.value)}
              />
              <input
                aria-label={`Unit for ingredient ${index + 1}`}
                placeholder="g"
                value={row.unit}
                onChange={(event) => updateRow(row.key, "unit", event.target.value)}
              />
              <input
                aria-label={`Ingredient ${index + 1}`}
                placeholder="Plain flour"
                className="col-span-2 sm:col-span-1"
                value={row.name}
                onChange={(event) => updateRow(row.key, "name", event.target.value)}
              />
              <button
                type="button"
                className="button button--danger col-span-2 justify-self-start sm:col-span-1"
                aria-label={`Remove ingredient ${index + 1}`}
                onClick={() => removeRow(row.key)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="button mt-4"
          onClick={() => setRows((current) => [...current, blankRow()])}
        >
          Add ingredient
        </button>
      </fieldset>

      <div className="field">
        <label htmlFor="instructions">Method</label>
        <p className="field__hint">One step per line.</p>
        <textarea
          id="instructions"
          name="instructions"
          rows={12}
          value={values.instructions}
          onChange={(event) => setValue("instructions")(event.target.value)}
          {...invalid("instructions")}
        />
        <FieldError errors={state.errors} field="instructions" />
      </div>

      <div className="border-line flex flex-wrap items-center gap-2 border-t pt-5">
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? "Saving..." : recipe ? "Update recipe" : "Create recipe"}
        </button>
        <Link href={backHref} className="button button--quiet sm:ml-auto">
          {backLabel}
        </Link>
      </div>
    </form>
  );
}
