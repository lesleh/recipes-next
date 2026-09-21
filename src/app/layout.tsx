import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Recipes", template: "%s | Recipes" },
  description: "Keeping recipes: what goes in them, how long they take, and how to cook them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="bg-paper text-ink min-h-dvh font-sans antialiased">
        <header className="border-line bg-card border-b">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
            <Link href="/" className="text-ink text-lg font-bold no-underline">
              Recipes
            </Link>
            <Link href="/recipes/new" className="button button--primary">
              New recipe
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-5 pb-20">{children}</main>
      </body>
    </html>
  );
}
