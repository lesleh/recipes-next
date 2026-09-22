import { Atkinson_Hyperlegible } from "next/font/google";
import localFont from "next/font/local";

/**
 * Two families, two files, covering latin, latin extended and vietnamese.
 * Every one has fallback metrics in Next, so nothing shifts as the real files
 * arrive.
 */

/**
 * Archivo carries the width axis, which keeps a long title on one line.
 *
 * Self-hosted rather than fetched from Google, because Google serves the width
 * axis all or nothing and the whole axis costs 90 KB. The file is preloaded,
 * so that competed with the recipe photo. `src/fonts/README.md` says what is
 * in the cut-down file and how to rebuild it.
 */
export const display = localFont({
  src: "../fonts/archivo-wdth-88.woff2",
  weight: "600 700",
  style: "normal",
  display: "swap",
  variable: "--font-display-face",
  // The width is pinned in the file, so say so on the face. `font-stretch: 88%`
  // in globals.css then matches rather than asking for a width that is not
  // there to vary.
  declarations: [{ prop: "font-stretch", value: "88%" }],
});

/**
 * Drawn by the Braille Institute for readers with low vision, which is the
 * same problem as reading a recipe from half a metre away.
 */
export const body = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body-face",
});
