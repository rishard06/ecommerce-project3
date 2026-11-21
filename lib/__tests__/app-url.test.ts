import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Task 11 (parked Task 07 Minor): the absolute app URL is one shared helper
 * instead of four copies. Semantics stay identical: validated
 * `NEXT_PUBLIC_APP_URL` first, `http://localhost:3000` as the dev fallback,
 * and one trailing slash stripped so callers can append paths.
 */

import { DEFAULT_APP_URL, siteUrl } from "@/lib/app-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("uses the configured app URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example");

    expect(siteUrl()).toBe("https://shop.example");
  });

  it("strips a trailing slash so paths can be appended", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example/");

    expect(siteUrl()).toBe("https://shop.example");
  });

  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);

    expect(siteUrl()).toBe(DEFAULT_APP_URL);
    expect(DEFAULT_APP_URL).toBe("http://localhost:3000");
  });
});
