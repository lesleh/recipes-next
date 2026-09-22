import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Vitest does not read .env files, and .env.local points at the development
// database. Read .env.test on its own and hand it to the workers, so nothing a
// test runs can reach the development data. The global setup checks the name
// before any test connects.
const testEnv = config({ path: ".env.test", processEnv: {} }).parsed ?? {};

// Two suites with different costs. Pure functions need nothing and run in
// parallel. Anything touching the database shares one test database, so those
// files run one at a time, or two of them truncate under each other.
export default defineConfig({
  // The "@/*" paths from tsconfig.json. Vite reads them itself, so this needs
  // no plugin.
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          env: testEnv,
          globalSetup: ["./tests/support/global-setup.ts"],
          setupFiles: ["./tests/support/truncate.ts"],
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    },
  },
});
