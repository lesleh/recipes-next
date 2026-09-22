"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { writeRecipe, type AiRecipeState } from "@/app/recipes/new/ai/actions";
import { DEFAULT_RECIPE_MODEL, MAX_PROMPT_LENGTH, RECIPE_MODELS } from "@/lib/ai-models";

export function AiRecipeForm() {
  const [state, formAction, pending] = useActionState<AiRecipeState, FormData>(writeRecipe, {
    error: null,
  });

  // Controlled, because React resets an uncontrolled form once the action
  // returns, which would empty the box on a failed generation.
  const [prompt, setPrompt] = useState("");

  const alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error) alert.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <div
          ref={alert}
          tabIndex={-1}
          role="alert"
          className="border-danger bg-danger-soft rounded-surface border-l-4 px-5 py-4"
        >
          <h2 className="text-danger">No recipe was written</h2>
          <p className="text-danger mt-2">{state.error}</p>
        </div>
      )}

      <div className="field">
        <label htmlFor="prompt">What would you like a recipe for?</label>
        <p className="field__hint">
          A sentence is enough, such as &ldquo;a quick weeknight dal for four&rdquo;. Say what you
          want to avoid, and how long you have.
        </p>
        <textarea
          id="prompt"
          name="prompt"
          rows={4}
          required
          maxLength={MAX_PROMPT_LENGTH}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          {...(state.error ? { "aria-invalid": true as const } : {})}
        />
      </div>

      <div className="field">
        <label htmlFor="model">Model</label>
        <p className="field__hint">Cheapest first. The default is a good place to start.</p>
        <select id="model" name="model" defaultValue={DEFAULT_RECIPE_MODEL}>
          {RECIPE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border-line flex flex-wrap items-center gap-2 border-t pt-5">
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending && (
            <span
              aria-hidden
              className="border-on-accent/40 border-t-on-accent size-4 animate-spin rounded-full border-2 motion-reduce:animate-none"
            />
          )}
          {pending ? "Writing the recipe..." : "Write the recipe"}
        </button>
        <Link href="/recipes/new" className="button button--quiet">
          Write it myself
        </Link>
        <Link href="/" className="button button--quiet sm:ml-auto">
          Back to recipes
        </Link>
      </div>

      {/* The wait runs to tens of seconds, so say so rather than leave a still
          page. A screen reader hears it when it appears. */}
      {pending && (
        <p role="status" className="field__hint">
          This can take up to a minute. The recipe opens as soon as it is saved.
        </p>
      )}
    </form>
  );
}
