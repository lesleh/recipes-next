import { execFileSync } from "node:child_process";

// Only production deployments migrate. Preview deployments share the same
// database here, so a branch must not apply its migrations before it merges,
// and a local build should not need a reachable database at all.
if (process.env.VERCEL_ENV !== "production") {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`);
  process.exit(0);
}

execFileSync("drizzle-kit", ["migrate"], { stdio: "inherit" });
