import { Archivo, Atkinson_Hyperlegible } from "next/font/google";

/**
 * Two families, three files, all subset to Latin. Every one has fallback
 * metrics in Next, so nothing shifts as the real files arrive.
 */

/** Archivo carries the width axis, which keeps a long title on one line. */
export const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display-face",
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
