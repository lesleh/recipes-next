import { config } from "dotenv";

/**
 * Refuse any database whose name does not end in "_test".
 *
 * The suite empties the tables between tests, so pointing it at the
 * development database would throw that data away. The database in `.env.test`
 * passes this check and the one in `.env.local` does not.
 */
export function requireTestDatabase(url: string | undefined) {
  if (!url) {
    throw new Error("DATABASE_URL is not set. It comes from .env.test.");
  }

  const name = new URL(url).pathname.replace(/^\//, "");

  if (!name.endsWith("_test")) {
    throw new Error(
      `Refusing to run the tests against the database "${name}", because the tests ` +
        `empty its tables and its name does not end in "_test". Check .env.test.`,
    );
  }

  return url;
}

/**
 * The connection string from `.env.test`. Read from the file rather than from
 * the environment, because Vitest does not load .env files, and because an
 * exported DATABASE_URL must not decide where the tests write.
 */
export function testDatabaseUrl() {
  const parsed = config({ path: ".env.test", processEnv: {} }).parsed ?? {};

  return requireTestDatabase(parsed.DATABASE_URL);
}
