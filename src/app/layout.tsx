import type { Metadata } from "next";
import Link from "next/link";

import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

import { body, display } from "./fonts";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
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
