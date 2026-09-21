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
