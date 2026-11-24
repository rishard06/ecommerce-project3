import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const now = new Date("2026-11-24T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("formats minutes, hours and days", () => {
    expect(formatRelativeTime(new Date("2026-11-24T11:58:00.000Z"), now)).toBe("2 min ago");
    expect(formatRelativeTime(new Date("2026-11-24T10:00:00.000Z"), now)).toBe("2 hours ago");
    expect(formatRelativeTime(new Date("2026-11-21T12:00:00.000Z"), now)).toBe("3 days ago");
  });
  it("uses 'just now' for the future and sub-minute values", () => {
    expect(formatRelativeTime(new Date("2026-11-24T12:01:00.000Z"), now)).toBe("just now");
  });
});
