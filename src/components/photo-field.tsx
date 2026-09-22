"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { RecipeFormError } from "@/app/recipes/actions";
import { CopyImagePromptButton } from "@/components/copy-image-prompt-button";
import { FieldError, messagesFor } from "@/components/field-error";
import type { RecipeWithIngredients } from "@/db/schema";
import { IMAGE_CONTENT_TYPES, validateImage } from "@/lib/validation";

/**
 * The photo half of the recipe form: choose a file or drop one on the box,
 * with the file checked before the form is submitted rather than after.
 *
 * The drop only ever sets the file input, so the upload itself is the same
 * multipart post it always was.
 */
export function PhotoField({
  recipe,
  errors,
}: {
  recipe?: RecipeWithIngredients;
  errors: RecipeFormError[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  // The preview address is made when the file is chosen rather than in an
  // effect, so there is one of them per file and it is released here.
  const objectUrl = useRef<string | null>(null);

  const show = (file: File | null) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);

    objectUrl.current = file ? URL.createObjectURL(file) : null;

    setChosen(file && objectUrl.current ? { file, url: objectUrl.current } : null);
  };

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  // A photo dropped anywhere but the box would otherwise replace the page with
  // the image, losing everything typed into the form.
  useEffect(() => {
    const swallow = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };

    document.addEventListener("dragover", swallow);
    document.addEventListener("drop", swallow);

    return () => {
      document.removeEventListener("dragover", swallow);
      document.removeEventListener("drop", swallow);
    };
  }, []);

  function take(file: File | undefined) {
    if (!file) return;

    const problem = validateImage(file);

    if (problem) {
      setRefused(problem);
      show(null);
      if (input.current) input.current.value = "";
      return;
    }

    setRefused(null);
    show(file);

    // A dropped file has to be put into the input by hand, because that is
    // what the form posts.
    if (input.current && input.current.files?.[0] !== file) {
      const transfer = new DataTransfer();

      transfer.items.add(file);
      input.current.files = transfer.files;
    }
  }

  function clear() {
    show(null);
    setRefused(null);
    if (input.current) input.current.value = "";
  }

  const invalid = refused !== null || messagesFor(errors, "image").length > 0;

  return (
    <div className="field">
      <label htmlFor="image">Photo</label>

      <div
        onDragEnter={() => setDragging(true)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          // Only when the pointer has left the box itself, or crossing a child
          // would flicker it.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files[0]);
        }}
        className={`rounded-control flex flex-wrap items-center gap-3 border-2 border-dashed px-4 py-5 transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-card"
        }`}
      >
        <input
          ref={input}
          id="image"
          type="file"
          name="image"
          accept={IMAGE_CONTENT_TYPES.join(",")}
          onChange={(event) => take(event.target.files?.[0] ?? undefined)}
          className="file:border-line-strong file:rounded-control file:text-ink file:bg-paper file:mr-3 file:cursor-pointer file:border file:px-4 file:py-2 file:text-base file:font-bold w-auto grow"
          {...(invalid ? { "aria-invalid": true as const, "aria-describedby": "image-error" } : {})}
        />
        <p className="field__hint" aria-hidden>
          or drop one here
        </p>
      </div>

      <p className="field__hint">JPEG, PNG or WebP, up to 4MB.</p>

      {refused ? (
        <p className="field__error" id="image-error">
          {refused}
        </p>
      ) : (
        <FieldError errors={errors} field="image" />
      )}

      {chosen && (
        <div className="mt-2 flex items-center gap-4">
          {/* Unoptimized, because this is a file on the reader's own machine
              that the image service cannot fetch. */}
          <Image
            src={chosen.url}
            alt=""
            width={192}
            height={144}
            unoptimized
            className="rounded-surface h-18 w-24 shrink-0 object-cover"
          />
          <div>
            <p className="text-base">{chosen.file.name}</p>
            <button type="button" className="button button--quiet mt-1" onClick={clear}>
              Choose a different photo
            </button>
          </div>
        </div>
      )}

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
  );
}
