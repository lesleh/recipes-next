import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

import { loadDisplayFont } from "@/lib/og-fonts";
import { findRecipeBySlug } from "@/lib/recipes";

export const alt = "Recipe photo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

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

  const png = new ImageResponse(
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
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              // A two-line title reaches 35% of the card's height, so the scrim
              // holds its strength to there and is gone by 60%. Above that the
              // photo is the point of the card.
              background:
                "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.62) 20%, rgba(0,0,0,0.42) 35%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0) 60%)",
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
            textShadow: photo ? "0 2px 6px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.8)" : "none",
          }}
        >
          {title}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Archivo", data: display, style: "normal", weight: 700 }] },
  );

  // ImageResponse only renders PNG, which is lossless and multiplies the
  // size of a photo for no visual gain. Re-encoding as JPEG here, after
  // satori has already composited the photo, title and gradient into one
  // raster, keeps the card a fraction of the size.
  const jpeg = await sharp(await png.arrayBuffer()).jpeg({ quality: 82 }).toBuffer();

  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": contentType } });
}
