import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 07: crawlers get an allow-all policy plus an absolute sitemap pointer
 * derived from the configured app URL (never a hardcoded domain).
 */

import robots from "./robots";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example/");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots route", () => {
  it("allows every crawler and points at the sitemap", () => {
    const result = robots();

    expect(result.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(result.sitemap).toBe("https://shop.example/sitemap.xml");
  });

  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);

    expect(robots().sitemap).toBe("http://localhost:3000/sitemap.xml");
  });
});
