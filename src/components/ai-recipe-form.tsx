"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { writeRecipe, type AiRecipeState } from "@/app/recipes/new/ai/actions";
import { RecipeDraft } from "@/components/recipe-draft";
import { Spinner } from "@/components/spinner";
import { DEFAULT_RECIPE_MODEL, MAX_CHANGE_LENGTH, RECIPE_MODELS } from "@/lib/ai-models";

type Intent = "generate" | "change" | "save";

const PENDING_LABEL: Record<Intent, string> = {
  generate: "Writing the recipe...",
  change: "Making the change...",
  save: "Saving...",
};

export function AiRecipeForm() {
  const [state, formAction, pending] = useActionState<AiRecipeState, FormData>(writeRecipe, {
    draft: null,
    error: null,
  });

  // Controlled, because React resets an uncontrolled form once the action
  // returns, which would empty both boxes on every round.
  const [prompt, setPrompt] = useState("");
  const [change, setChange] = useState("");

  // Which button was pressed, so the spinner can sit on that one and the
  // change box knows whether its instruction was carried out.
  const [intent, setIntent] = useState<Intent>("generate");
  const lastIntent = useRef<Intent>("generate");

  const alert = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error) {
      alert.current?.focus();
      return;
    }

    // A change that worked is spent, so the box is ready for the next one.
    if (lastIntent.current === "change") setChange("");
  }, [state]);

  const press = (next: Intent) => () => {
    setIntent(next);
    lastIntent.current = next;
  };

  const busy = (which: Intent) => pending && intent === which;
  const draft = state.draft;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <div
          ref={alert}
          tabIndex={-1}
          role="alert"
          className="border-danger bg-danger-soft rounded-surface border-l-4 px-5 py-4"
        >
          <h2 className="text-danger">{draft ? "The draft was kept" : "No recipe was written"}</h2>
          <p className="text-danger mt-2">{state.error}</p>
        </div>
      )}

      <div className="field">
        <label htmlFor="prompt">Describe a recipe, or paste one in</label>
        <p className="field__hint">
          A sentence is enough, such as &ldquo;a quick weeknight dal for four&rdquo;. Or paste a
          whole recipe, and anything it leaves out, such as the cooking time, is filled in.
        </p>
        {/* No maxLength: a browser cuts a long paste short without saying so. */}
        <textarea
          id="prompt"
          name="prompt"
          rows={6}
          required
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          name="intent"
          value="generate"
          onClick={press("generate")}
          disabled={pending}
          className={draft ? "button" : "button button--primary"}
        >
          {busy("generate") && <Spinner />}
          {busy("generate")
            ? PENDING_LABEL.generate
            : draft
              ? "Start a new draft"
              : "Write the recipe"}
        </button>

        {!draft && (
          <Link href="/recipes/new" className="button button--quiet">
            Write it myself
          </Link>
        )}
      </div>

      {pending && !draft && (
        <p role="status" className="field__hint">
          This can take up to a minute.
        </p>
      )}

      {draft && (
        <>
          <RecipeDraft draft={draft} />

          <div className="field">
            <label htmlFor="change">What should change?</label>
            <p className="field__hint">
              One instruction at a time works best, such as &ldquo;make it vegan&rdquo; or
              &ldquo;halve the chilli&rdquo;. The whole recipe is written again.
            </p>
            <textarea
              id="change"
              name="change"
              rows={2}
              maxLength={MAX_CHANGE_LENGTH}
              value={change}
              onChange={(event) => setChange(event.target.value)}
            />
          </div>

          <div className="border-line flex flex-wrap items-center gap-2 border-t pt-5">
            <button
              type="submit"
              name="intent"
              value="change"
              onClick={press("change")}
              disabled={pending || change.trim() === ""}
              className="button"
            >
              {busy("change") && <Spinner />}
              {busy("change") ? PENDING_LABEL.change : "Make the change"}
            </button>

            <button
              type="submit"
              name="intent"
              value="save"
              onClick={press("save")}
              disabled={pending}
              className="button button--primary"
            >
              {busy("save") && <Spinner />}
              {busy("save") ? PENDING_LABEL.save : "Save recipe"}
            </button>

            <Link href="/" className="button button--quiet sm:ml-auto">
              Back to recipes
            </Link>
          </div>

          {pending && (
            <p role="status" className="field__hint">
              {intent === "save" ? "Saving the recipe." : "Writing it again. This takes a moment."}
            </p>
          )}
        </>
      )}
    </form>
  );
}
