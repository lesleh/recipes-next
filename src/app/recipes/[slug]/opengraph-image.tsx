import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { loadDisplayFont } from "@/lib/og-fonts";
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

  const [display, photo] = await Promise.all([
    loadDisplayFont(title),
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
              background: "linear-gradient(to top, rgba(22,34,44,0.8), rgba(22,34,44,0) 55%)",
            }}
          />
        )}

        <div
          style={{
            display: "flex",
            position: "relative",
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
      </div>
    ),
    { ...size, fonts: [{ name: "Archivo", data: display, style: "normal", weight: 700 }] },
  );
}
