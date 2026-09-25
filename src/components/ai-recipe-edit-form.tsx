"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { changeRecipe, type AiEditState } from "@/app/recipes/[slug]/edit/ai/actions";
import { RecipeDraft } from "@/components/recipe-draft";
import { Spinner } from "@/components/spinner";
import { DEFAULT_RECIPE_MODEL, MAX_CHANGE_LENGTH, RECIPE_MODELS } from "@/lib/ai-models";
import type { RecipeForModel } from "@/lib/recipe-writer";

type Intent = "change" | "save" | "discard";

const PENDING_LABEL: Record<Intent, string> = {
  change: "Making the change...",
  save: "Saving...",
  discard: "Discarding...",
};

/**
 * The loop on the page that writes a new recipe, started from a saved one.
 * The saved recipe is shown until the first change, and only save writes.
 */
export function AiRecipeEditForm({
  id,
  slug,
  saved,
}: {
  id: number;
  slug: string;
  saved: RecipeForModel;
}) {
  const [state, formAction, pending] = useActionState<AiEditState, FormData>(changeRecipe, {
    draft: null,
    error: null,
  });

  // Controlled, because React resets an uncontrolled form once the action
  // returns, which would empty the box on every round.
  const [change, setChange] = useState("");

  const [intent, setIntent] = useState<Intent>("change");
  const lastIntent = useRef<Intent>("change");

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
      <input type="hidden" name="id" value={id} />

      {state.error && (
        <div
          ref={alert}
          tabIndex={-1}
          role="alert"
          className="border-danger bg-danger-soft rounded-surface border-l-4 px-5 py-4"
        >
          <h2 className="text-danger">
            {draft ? "The draft was kept" : "The recipe was not changed"}
          </h2>
          <p className="text-danger mt-2">{state.error}</p>
        </div>
      )}

      <RecipeDraft
        draft={draft ?? saved}
        note={
          draft
            ? "Draft. The saved recipe is unchanged until you press save."
            : "The recipe as saved."
        }
      />

      <div className="field">
        <label htmlFor="change">What should change?</label>
        <p className="field__hint">
          One instruction at a time works best, such as &ldquo;make it vegan&rdquo; or &ldquo;make
          it serve six&rdquo;. The whole recipe is written again.
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
        <button
          type="submit"
          name="intent"
          value="change"
          onClick={press("change")}
          disabled={pending || change.trim() === ""}
          className={draft ? "button" : "button button--primary"}
        >
          {busy("change") && <Spinner />}
          {busy("change") ? PENDING_LABEL.change : "Make the change"}
        </button>

        {draft && (
          <>
            <button
              type="submit"
              name="intent"
              value="save"
              onClick={press("save")}
              disabled={pending}
              className="button button--primary"
            >
              {busy("save") && <Spinner />}
              {busy("save") ? PENDING_LABEL.save : "Save changes"}
            </button>

            <button
              type="submit"
              name="intent"
              value="discard"
              onClick={press("discard")}
              disabled={pending}
              className="button button--quiet"
            >
              {busy("discard") ? PENDING_LABEL.discard : "Discard changes"}
            </button>
          </>
        )}

        <Link href={`/recipes/${slug}`} className="button button--quiet sm:ml-auto">
          Back to recipe
        </Link>
      </div>

      {pending && intent === "change" && (
        <p role="status" className="field__hint">
          Writing it again. This can take up to a minute.
        </p>
      )}
    </form>
  );
}
