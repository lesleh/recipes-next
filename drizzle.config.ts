import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { requireDatabaseUrl } from "./src/db/url";

// Next.js reads .env.local, drizzle-kit does not, so load it explicitly.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: requireDatabaseUrl() },
});
