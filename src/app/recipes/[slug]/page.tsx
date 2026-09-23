import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { ingredientAmount, instructionSteps, truncate } from "@/lib/format";
import { breadcrumbJsonLd, jsonLdScript, recipeJsonLd } from "@/lib/recipe-jsonld";
import { findRecipeBySlug, listRecipeAddresses } from "@/lib/recipes";
import { SITE_NAME } from "@/lib/site";

import { loadRecipeBySlug } from "./load";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Prerender every recipe at build time, so a reader waits for a file rather
 * than for a database. The build migrates the database first, so it is
 * reachable here.
 *
 * A slug this misses still works: a recipe added since the build renders once
 * on demand, and a retired slug redirects on demand. Both are then kept, and
 * the save and delete actions revalidate the addresses they change.
 */
export async function generateStaticParams() {
  const recipes = await listRecipeAddresses();

  return recipes.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await findRecipeBySlug(slug);

  if (!recipe) return { title: "Recipe" };

  const description = recipe.description ? truncate(recipe.description, 200) : undefined;
  const url = `/recipes/${recipe.slug}`;

  return {
    title: recipe.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: recipe.title, description, type: "article", url, siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title: recipe.title, description },
  };
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await loadRecipeBySlug(slug);
  const steps = instructionSteps(recipe.instructions);
  const hasFacts =
    recipe.prepTimeMinutes !== null ||
    recipe.cookTimeMinutes !== null ||
    recipe.servings !== null ||
    recipe.category !== null ||
    recipe.cuisine !== null;

  return (
    <article className="page">
      {/* Structured data for search engines. A native script tag, because this
          is data rather than code for the browser to run. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(recipeJsonLd(recipe)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(recipe)) }}
      />

      {/* The trail the breadcrumb data describes. Search engines discount
          structured data that names a path the page does not show. */}
      <nav aria-label="Breadcrumb" className="print-hide">
        <ol className="breadcrumb">
          <li>
            <Link href="/">{SITE_NAME}</Link>
          </li>
          <li aria-current="page">{recipe.title}</li>
        </ol>
      </nav>

      <h1 className="mt-2">{recipe.title}</h1>

      {recipe.description && (
        <p className="text-ink-soft mt-3 max-w-[58ch] text-lg">{recipe.description}</p>
      )}

      {hasFacts && (
        <p className="meta border-line mt-5 border-y py-3">
          {recipe.prepTimeMinutes !== null && (
            <span>
              Prep <strong>{recipe.prepTimeMinutes}</strong> min
            </span>
          )}
          {recipe.cookTimeMinutes !== null && (
            <span>
              Cook <strong>{recipe.cookTimeMinutes}</strong> min
            </span>
          )}
          {recipe.servings !== null && (
            <span>
              Serves <strong>{recipe.servings}</strong>
            </span>
          )}
          {/* The course and the cuisine are in the structured data, and a
              search engine discounts data the page itself does not show. */}
          {recipe.category && (
            <span>
              Category <strong>{recipe.category}</strong>
            </span>
          )}
          {recipe.cuisine && (
            <span>
              Cuisine <strong>{recipe.cuisine}</strong>
            </span>
          )}
        </p>
      )}

      {recipe.imageUrl && (
        /* The photo is this page's largest element, so it loads at once and
           ahead of everything else. `priority` did both until Next 16
           deprecated it. */
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          width={1600}
          height={1067}
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 56rem) 56rem, 100vw"
          className="recipe-photo"
        />
      )}

      <div className="recipe-columns mt-8 grid gap-x-10 gap-y-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <section className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
          <h2>Ingredients</h2>
          {recipe.ingredients.length > 0 ? (
            <ul className="ingredients mt-3">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="ingredient">
                  <span className="ingredient__quantity">{ingredientAmount(ingredient)}</span>
                  <span className="ingredient__name">{ingredient.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty mt-3">No ingredients listed.</p>
          )}
        </section>

        <section>
          <h2>Method</h2>
          {steps.length > 0 ? (
            <ol className="steps mt-4">
              {steps.map((step, index) => (
                /* The id is what the structured data's step addresses point
                   at, so a reader arriving from a search result lands on the
                   step rather than the top of the page. */
                <li key={index} id={`step-${index + 1}`} className="step">
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
        </section>
      </div>

      <div className="border-line print-hide mt-10 flex flex-wrap items-center gap-2 border-t pt-5">
        {/* Prefetch off: same reason as the header's "New recipe" link. */}
        <Link href={`/recipes/${recipe.slug}/edit`} prefetch={false} className="button">
          Edit
        </Link>
        <DeleteRecipeButton id={recipe.id} title={recipe.title} />
        <Link href="/" className="button button--quiet sm:ml-auto">
          Back to recipes
        </Link>
      </div>
    </article>
  );
}
