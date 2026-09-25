import { ingredientAmount, instructionSteps } from "@/lib/format";
import type { RecipeForModel } from "@/lib/recipe-writer";
import { parseTags } from "@/lib/tags";

/**
 * A draft as it would look once saved, or a saved recipe before its first
 * change. Read-only on purpose: a change goes back to the model, and the edit
 * page is where a typed correction belongs.
 */
export function RecipeDraft({
  draft,
  note = "Draft. Nothing is saved until you press save.",
}: {
  draft: RecipeForModel;
  note?: string;
}) {
  const steps = instructionSteps(draft.instructions);
  const tags = parseTags([draft.tags]);
  const hasFacts =
    draft.prepTimeMinutes !== null ||
    draft.cookTimeMinutes !== null ||
    draft.servings !== null ||
    draft.category !== "" ||
    draft.cuisine !== "";

  return (
    <section aria-labelledby="draft-title" className="panel">
      <p className="field__hint">{note}</p>

      <h2 id="draft-title" className="mt-1">
        {draft.title}
      </h2>

      {draft.description && <p className="text-ink-soft mt-2 max-w-[58ch]">{draft.description}</p>}

      {hasFacts && (
        <p className="meta border-line mt-4 border-y py-3">
          {draft.prepTimeMinutes !== null && (
            <span>
              Prep <strong>{draft.prepTimeMinutes}</strong> min
            </span>
          )}
          {draft.cookTimeMinutes !== null && (
            <span>
              Cook <strong>{draft.cookTimeMinutes}</strong> min
            </span>
          )}
          {draft.servings !== null && (
            <span>
              Serves <strong>{draft.servings}</strong>
            </span>
          )}
          {draft.category && (
            <span>
              Category <strong>{draft.category}</strong>
            </span>
          )}
          {draft.cuisine && (
            <span>
              Cuisine <strong>{draft.cuisine}</strong>
            </span>
          )}
        </p>
      )}

      {/* Plain pills rather than links: a link would leave the page, and the
          draft with it. */}
      {tags.length > 0 && (
        <ul aria-label="Tags" className="tag-list mt-4">
          {tags.map((tag) => (
            <li key={tag}>
              <span className="tag">{tag}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div>
          <h3>Ingredients</h3>
          {draft.ingredients.length > 0 ? (
            <ul className="ingredients mt-3">
              {draft.ingredients.map((ingredient, index) => (
                <li key={`${ingredient.name}-${index}`} className="ingredient">
                  <span className="ingredient__quantity">{ingredientAmount(ingredient)}</span>
                  <span className="ingredient__name">{ingredient.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty mt-3">No ingredients listed.</p>
          )}
        </div>

        <div>
          <h3>Method</h3>
          {steps.length > 0 ? (
            <ol className="steps mt-4">
              {steps.map((step, index) => (
                <li key={index} className="step">
                  <span className="step__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="step__text">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty mt-3">No method written yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
