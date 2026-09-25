import Link from "next/link";

import { AiRecipeForm } from "@/components/ai-recipe-form";
import { GATEWAY_KEY_MISSING } from "@/lib/recipe-writer";

export const metadata = { title: "Write a recipe with AI" };

/**
 * A page-level limit covers the server function on it. A recipe takes tens of
 * seconds, and saving one draws its illustration afterwards inside the same
 * limit, so this is headroom rather than a target.
 */
export const maxDuration = 120;

/**
 * The key is read on every request rather than at build time. Prerendered,
 * the page would keep saying it is not set up until the next deploy, and
 * adding a variable in Vercel does not deploy anything.
 */
export const dynamic = "force-dynamic";

export default function AiRecipePage() {
  // Read here as well as in the action, so a missing key reads as a sentence
  // on the page rather than as a failed generation a minute later.
  const configured = Boolean(process.env.AI_GATEWAY_API_KEY);

  return (
    <div className="page">
      <h1>Write a recipe with AI</h1>
      <p className="text-ink-soft mt-2">
        Describe the recipe you want or paste one in, read the draft, and ask for changes until it
        is right. Nothing is saved until you press save.
      </p>

      <div className="mt-6">
        {configured ? (
          <AiRecipeForm />
        ) : (
          <div className="border-danger bg-danger-soft rounded-surface border-l-4 px-5 py-4">
            <h2 className="text-danger">This page is not set up yet</h2>
            <p className="text-danger mt-2">{GATEWAY_KEY_MISSING}</p>
            <p className="mt-2">
              <Link href="/recipes/new">Write a recipe yourself instead</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
