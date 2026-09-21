import { ImageResponse } from "next/og";

import { loadBodyFont, loadDisplayFont } from "@/lib/og-fonts";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [display, body] = await Promise.all([
    loadDisplayFont(SITE_NAME),
    loadBodyFont(SITE_DESCRIPTION),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#edf1ee",
          fontFamily: "Atkinson Hyperlegible",
        }}
      >
        <div style={{ display: "flex", width: 96, height: 8, borderRadius: 4, background: "#16408c" }} />
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 116,
            fontFamily: "Archivo",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#16222c",
          }}
        >
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 34, maxWidth: 840, color: "#4e5c66" }}>
          {SITE_DESCRIPTION}
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
