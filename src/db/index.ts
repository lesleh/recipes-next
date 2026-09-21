import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// The WebSocket pool rather than the HTTP driver: saving a recipe and its
// ingredients needs a real transaction, which neon-http cannot give us.
const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle(pool, { schema });
