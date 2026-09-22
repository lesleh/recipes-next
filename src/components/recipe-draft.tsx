import { ingredientAmount, instructionSteps } from "@/lib/format";
import type { GeneratedRecipe } from "@/lib/recipe-writer";

/**
 * A draft as it would look once saved. Read-only on purpose: a change goes
 * back to the model, and the edit page is where a typed correction belongs.
 */
export function RecipeDraft({ draft }: { draft: GeneratedRecipe }) {
  const steps = instructionSteps(draft.instructions);

  return (
    <section aria-labelledby="draft-title" className="panel">
      <p className="field__hint">Draft. Nothing is saved until you press save.</p>

      <h2 id="draft-title" className="mt-1">
        {draft.title}
      </h2>

      {draft.description && <p className="text-ink-soft mt-2 max-w-[58ch]">{draft.description}</p>}

      <p className="meta border-line mt-4 border-y py-3">
        <span>
          Prep <strong>{draft.prepTimeMinutes}</strong> min
        </span>
        <span>
          Cook <strong>{draft.cookTimeMinutes}</strong> min
        </span>
        <span>
          Serves <strong>{draft.servings}</strong>
        </span>
      </p>

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
