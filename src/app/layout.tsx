import type { Metadata } from "next";
import Link from "next/link";

import { body, display } from "./fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Recipes", template: "%s | Recipes" },
  description: "Keeping recipes: what goes in them, how long they take, and how to cook them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${body.variable} ${display.variable}`}>
      <body className="bg-paper text-ink min-h-dvh antialiased">
        <header className="border-line bg-card print-hide border-b">
          <div className="page flex items-center justify-between gap-4 py-3">
            <Link
              href="/"
              className="display text-ink inline-flex min-h-11 items-center text-xl font-bold tracking-tight no-underline"
            >
              Recipes
            </Link>
            {/* Prefetch off: this route needs the write password, and a
                background prefetch of it would trip the browser's Basic
                Auth prompt on every public page that renders this link. */}
            <Link href="/recipes/new" prefetch={false} className="button button--primary">
              New recipe
            </Link>
          </div>
        </header>

        {/* The width cap lives on each page, not here, so the home page can be
            wider than a recipe. */}
        <main className="pt-6 pb-20">{children}</main>
      </body>
    </html>
  );
}
