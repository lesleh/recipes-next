import { afterEach, describe, expect, it, vi } from "vitest";

import { checkWriteAccess } from "./auth";

/** The header a browser sends after the basic auth prompt. */
function basic(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkWriteAccess", () => {
  it("reports unconfigured when no password is set", () => {
    vi.stubEnv("RECIPES_WRITE_PASSWORD", "");

    expect(checkWriteAccess(basic("anyone", "letmein"))).toBe("unconfigured");
  });

  it("grants access for the right password", () => {
    vi.stubEnv("RECIPES_WRITE_PASSWORD", "letmein");

    expect(checkWriteAccess(basic("anyone", "letmein"))).toBe("granted");
  });

  it("ignores the username, because there is one shared password", () => {
    vi.stubEnv("RECIPES_WRITE_PASSWORD", "letmein");

    expect(checkWriteAccess(basic("", "letmein"))).toBe("granted");
    expect(checkWriteAccess(basic("someone else", "letmein"))).toBe("granted");
  });

  it("keeps a password holding a colon whole", () => {
    vi.stubEnv("RECIPES_WRITE_PASSWORD", "let:me:in");

    expect(checkWriteAccess(basic("anyone", "let:me:in"))).toBe("granted");
  });

  it("denies the wrong password", () => {
    vi.stubEnv("RECIPES_WRITE_PASSWORD", "letmein");

    expect(checkWriteAccess(basic("anyone", "letmeout"))).toBe("denied");
    expect(checkWriteAccess(basic("anyone", ""))).toBe("denied");
    expect(checkWriteAccess(basic("anyone", "letmein "))).toBe("denied");
  });

  it("denies a missing or malformed header", () => {
    vi.stubEnv("RECIPES_WRITE_PASSWORD", "letmein");

    expect(checkWriteAccess(null)).toBe("denied");
    expect(checkWriteAccess("")).toBe("denied");
    expect(checkWriteAccess("Bearer letmein")).toBe("denied");
    expect(checkWriteAccess("Basic")).toBe("denied");
    // No colon, so there is no password half to read.
    expect(checkWriteAccess(`Basic ${Buffer.from("letmein").toString("base64")}`)).toBe("denied");
  });

  it("reads the scheme whatever its case", () => {
    vi.stubEnv("RECIPES_WRITE_PASSWORD", "letmein");

    expect(checkWriteAccess(basic("anyone", "letmein").replace("Basic", "basic"))).toBe("granted");
  });
});
