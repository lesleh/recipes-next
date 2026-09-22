import { beforeEach, vi } from "vitest";

import type { removeImage as remove, storeImage as store } from "@/lib/storage";

/**
 * Stands in for the parts of Next.js and the photo store that a server action
 * reaches for, so the actions can run against the test database.
 *
 * `redirect` and `permanentRedirect` throw in Next, which is how the code
 * after them never runs. These throw too, carrying the address, so a test can
 * read where the action sent the reader.
 */

export class RedirectError extends Error {
  constructor(readonly destination: string) {
    super(`redirect to ${destination}`);
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("not found");
  }
}

/** The Authorization header the next action call sees. */
let authorization: string | null = null;

/** Every path revalidatePath was called with, since the last test started. */
export const revalidated: string[] = [];

export function signIn(password: string) {
  authorization = `Basic ${Buffer.from(`recipes:${password}`, "utf8").toString("base64")}`;
}

export function signOut() {
  authorization = null;
}

vi.mock("next/headers", () => ({
  headers: async () => new Headers(authorization ? { authorization } : {}),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    revalidated.push(path);
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new RedirectError(destination);
  },
  permanentRedirect: (destination: string) => {
    throw new RedirectError(destination);
  },
  notFound: () => {
    throw new NotFoundError();
  },
}));

// Nothing here writes a file. The tests that care assert on what the action
// stored on the recipe row instead.
export const storeImage = vi.fn<typeof store>(async (_file, filename) => ({
  imageUrl: `https://example.test/${filename}`,
  imagePathname: `uploads/${filename}`,
}));

export const removeImage = vi.fn<typeof remove>(async () => {});

vi.mock("@/lib/storage", () => ({ storeImage, removeImage }));

beforeEach(() => {
  revalidated.length = 0;
  storeImage.mockClear();
  removeImage.mockClear();
  signIn(process.env.RECIPES_WRITE_PASSWORD ?? "");
});

/**
 * Run an action that is expected to redirect, and give the address it sent the
 * reader to.
 */
export async function captureRedirect(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectError) return error.destination;
    throw error;
  }

  throw new Error("Expected a redirect, but the action returned instead.");
}
