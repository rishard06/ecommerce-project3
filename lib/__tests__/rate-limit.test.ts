/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  clearRateLimitStore,
} from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("allows requests under the limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("ip:1", 5, 60_000, now + i).ok).toBe(true);
    }
  });

  it("blocks after N hits and reports retryAfter", () => {
    const now = 2_000_000;
    for (let i = 0; i < 5; i++) {
      checkRateLimit("ip:2", 5, 60_000, now);
    }
    const blocked = checkRateLimit("ip:2", 5, 60_000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("slides the window forward", () => {
    const now = 3_000_000;
    for (let i = 0; i < 3; i++) {
      checkRateLimit("ip:3", 3, 60_000, now);
    }
    expect(checkRateLimit("ip:3", 3, 60_000, now).ok).toBe(false);
    expect(checkRateLimit("ip:3", 3, 60_000, now + 61_000).ok).toBe(true);
  });

  it("isolates keys", () => {
    const now = 4_000_000;
    checkRateLimit("a", 1, 60_000, now);
    expect(checkRateLimit("b", 1, 60_000, now).ok).toBe(true);
  });
});
