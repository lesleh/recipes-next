"use client";

import { useEffect, useState } from "react";

import type { RecipeWithIngredients } from "@/db/schema";
import { imagePromptFor } from "@/lib/recipe-image-prompt";

type Result = "idle" | "copied" | "failed";

/**
 * Select a hidden textarea and copy it. `document.execCommand` is deprecated
 * and still works in every browser, which is the whole reason it is here.
 */
function copyTheOldWay(text: string) {
  const field = document.createElement("textarea");

  field.value = text;
  // Off screen rather than hidden, because a hidden field cannot be selected.
  field.setAttribute("aria-hidden", "true");
  field.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0";

  document.body.append(field);
  field.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

const LABEL: Record<Result, string> = {
  idle: "Copy image prompt",
  copied: "Copied",
  failed: "Could not copy",
};

/**
 * Puts the image prompt and the recipe on the clipboard, ready to paste into
 * Gemini. The prompt is built here rather than on the server, because the
 * clipboard needs the text inside the click that asked for it.
 */
export function CopyImagePromptButton({ recipe }: { recipe: RecipeWithIngredients }) {
  const [result, setResult] = useState<Result>("idle");

  // The label goes back to itself, so a second copy still reads as one.
  useEffect(() => {
    if (result === "idle") return;

    const timer = setTimeout(() => setResult("idle"), 4000);

    return () => clearTimeout(timer);
  }, [result]);

  async function copy() {
    const prompt = imagePromptFor(recipe);

    try {
      await navigator.clipboard.writeText(prompt);
      setResult("copied");
    } catch {
      // The clipboard API is refused outside a secure context, and some
      // embedded browsers refuse it everywhere. The old way needs no
      // permission, so it is the fallback rather than the first choice.
      setResult(copyTheOldWay(prompt) ? "copied" : "failed");
    }
  }

  return (
    <>
      <button type="button" className="button" onClick={copy}>
        {LABEL[result]}
      </button>
      {/* Announced rather than shown, because the label says it already. */}
      <span role="status" className="sr-only">
        {result === "copied" ? "Image prompt copied to the clipboard" : ""}
      </span>
    </>
  );
}
