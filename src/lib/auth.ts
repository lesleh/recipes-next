import { createHash, timingSafeEqual } from "node:crypto";

export const WRITE_PASSWORD_MISSING =
  "RECIPES_WRITE_PASSWORD is not set. Copy .env.example to .env.local and fill it in.";

/** What the site does with a request for a page or an action that writes. */
export type WriteAccess = "granted" | "denied" | "unconfigured";

/**
 * Hashed first, so the comparison is over two 32-byte values whatever the
 * passwords are. timingSafeEqual needs equal lengths, and comparing the raw
 * strings would both throw on a mismatch and leak the real length.
 */
function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

/** The password half of a basic auth header, or null when it is not one. */
function passwordFrom(authorization: string | null) {
  if (!authorization) return null;

  const [scheme, encoded] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return null;

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const colon = decoded.indexOf(":");

  // The username is not checked. One shared password is the whole model, so
  // whatever name the browser prompt collects is thrown away.
  return colon === -1 ? null : decoded.slice(colon + 1);
}

export function checkWriteAccess(authorization: string | null): WriteAccess {
  const expected = process.env.RECIPES_WRITE_PASSWORD;

  // Nothing here grants access when the variable is missing, so a deploy that
  // forgot it locks the write pages rather than opening them.
  if (!expected) return "unconfigured";

  // Compared even when the header is absent or malformed, so a request with no
  // password takes as long to refuse as one with a wrong password.
  const supplied = passwordFrom(authorization) ?? "";

  return timingSafeEqual(digest(expected), digest(supplied)) ? "granted" : "denied";
}
