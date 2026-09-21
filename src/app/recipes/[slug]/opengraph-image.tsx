import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { truncate } from "@/lib/format";
import { loadBodyFont, loadDisplayFont } from "@/lib/og-fonts";
import { findRecipeBySlug } from "@/lib/recipes";

export const alt = "Recipe photo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A local upload lives under public/; anything else is Vercel Blob, over HTTP. */
async function loadPhoto(imageUrl: string) {
  if (imageUrl.startsWith("/")) {
    const buffer = await readFile(join(process.cwd(), "public", imageUrl));
    return Uint8Array.from(buffer).buffer;
  }

  const response = await fetch(imageUrl);
  return response.arrayBuffer();
}

type PageProps = { params: Promise<{ slug: string }> };

export default async function Image({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await findRecipeBySlug(slug);
  const title = recipe?.title ?? "Recipe";
  const description = recipe?.description ? truncate(recipe.description, 140) : null;

  const facts = recipe
    ? ([
        recipe.prepTimeMinutes !== null ? `Prep ${recipe.prepTimeMinutes} min` : null,
        recipe.cookTimeMinutes !== null ? `Cook ${recipe.cookTimeMinutes} min` : null,
        recipe.servings !== null ? `Serves ${recipe.servings}` : null,
      ].filter(Boolean) as string[])
    : [];

  const [display, body, photo] = await Promise.all([
    loadDisplayFont(title),
    loadBodyFont([description, ...facts].filter(Boolean).join(" ") || title),
    recipe?.imageUrl ? loadPhoto(recipe.imageUrl).catch(() => null) : Promise.resolve(null),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "64px",
          background: photo ? "#16222c" : "#edf1ee",
          fontFamily: "Atkinson Hyperlegible",
        }}
      >
        {photo && (
          <img
            // Satori accepts an ArrayBuffer for <img src> at runtime, ahead of the DOM spec.
            // @ts-expect-error see above
            src={photo}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
          />
        )}

        {photo && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background:
                "linear-gradient(to top, rgba(22,34,44,0.92), rgba(22,34,44,0.25) 55%, rgba(22,34,44,0) 100%)",
            }}
          />
        )}

        <div style={{ display: "flex", position: "relative", flexDirection: "column" }}>
          <div
            style={{ display: "flex", width: 80, height: 8, borderRadius: 4, background: "#16408c" }}
          />

          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 72,
              fontFamily: "Archivo",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: photo ? "#ffffff" : "#16222c",
            }}
          >
            {title}
          </div>

          {description && (
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 30,
                maxWidth: 980,
                color: photo ? "#e2e8f3" : "#4e5c66",
              }}
            >
              {description}
            </div>
          )}

          {facts.length > 0 && (
            <div style={{ display: "flex", gap: 32, marginTop: 28 }}>
              {facts.map((fact) => (
                <div
                  key={fact}
                  style={{
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 700,
                    color: photo ? "#ffffff" : "#16222c",
                  }}
                >
                  {fact}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: display, style: "normal", weight: 700 },
        { name: "Atkinson Hyperlegible", data: body, style: "normal", weight: 400 },
      ],
    },
  );
}
