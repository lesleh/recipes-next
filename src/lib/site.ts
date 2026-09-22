export const SITE_NAME = "Recipes";
export const SITE_AUTHOR = "Leslie Hoare";
export const SITE_DESCRIPTION =
  "Keeping recipes: what goes in them, how long they take, and how to cook them.";

/**
 * Where the site answers, as an origin. `SITE_URL` is for a self-hosted run on
 * its own domain. Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` to the project's
 * production domain, with no protocol, on preview deployments too. Neither is
 * set in local development, where the site is plain HTTP on 3000.
 */
export function siteUrl() {
  const configured = process.env.SITE_URL;

  if (configured) return new URL(configured);

  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  return host ? new URL(`https://${host}`) : new URL("http://localhost:3000");
}

/**
 * An address anything off the site can fetch. A path gets the site origin in
 * front of it, and an address that already carries an origin is left alone.
 */
export function absoluteUrl(path: string) {
  return new URL(path, siteUrl()).toString();
}
