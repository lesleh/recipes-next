export const SITE_NAME = "Recipes";
export const SITE_DESCRIPTION =
  "Keeping recipes: what goes in them, how long they take, and how to cook them.";

/**
 * Vercel sets this to the project's production domain, with no protocol. It
 * is absent in local development, where the site is plain HTTP on 3000.
 */
export function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  return host ? new URL(`https://${host}`) : new URL("http://localhost:3000");
}

/**
 * A stored photo can be a multi-megabyte original, and a share card doesn't
 * need it at full size. Routing it through Next's own image optimizer resizes
 * and recompresses it, rather than pushing the original bytes to every crawler.
 */
export function ogImageUrl(imageUrl: string) {
  return `/_next/image?url=${encodeURIComponent(imageUrl)}&w=1200&q=75`;
}
