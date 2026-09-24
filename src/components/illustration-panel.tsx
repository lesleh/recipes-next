"use client";

import { useActionState } from "react";

import { drawIllustration, type IllustrationState } from "@/app/recipes/actions";
import { RecipeIllustration } from "@/components/recipe-illustration";
import type { Illustration } from "@/lib/illustration";

/**
 * The drawing as it stands, and the button that draws a new one. Its own
 * form, outside the recipe form, so drawing never saves half-edited fields.
 */
export function IllustrationPanel({
  id,
  slug,
  illustration,
}: {
  id: number;
  slug: string;
  illustration: Illustration | null;
}) {
  const [state, formAction, pending] = useActionState<IllustrationState, FormData>(
    drawIllustration,
    { error: null },
  );

  return (
    <section aria-labelledby="illustration-heading" className="panel flex flex-wrap items-center gap-5">
      <RecipeIllustration illustration={illustration} seed={slug} className="size-32 shrink-0" />

      <div className="flex min-w-60 flex-1 flex-col gap-2">
        <h2 id="illustration-heading" className="text-xl">
          Illustration
        </h2>
        <p className="field__hint">
          Drawn by Claude Opus 5.5. It takes about half a minute and is saved straight away. Saving
          the recipe never redraws it.
        </p>

        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="button" disabled={pending}>
            {pending ? "Drawing..." : illustration ? "Redraw illustration" : "Draw illustration"}
          </button>
        </form>

        {/* Announced, because the wait is long enough to wonder whether
            anything happened. */}
        <p aria-live="polite" className="field__error empty:hidden">
          {!pending && state.error}
        </p>
      </div>
    </section>
  );
}
