import { describe, expect, it } from "vitest";
import { safeNextPath } from "../safe-next-path";

describe("safeNextPath", () => {
  it("keeps root-relative paths with query strings and hashes", () => {
    expect(safeNextPath("/account/orders?tab=all#latest")).toBe(
      "/account/orders?tab=all#latest",
    );
    expect(safeNextPath("/")).toBe("/");
  });

  it("falls back to / when next is missing or empty", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("http://evil.example/account")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("///evil.example")).toBe("/");
  });

  it("rejects javascript: URLs", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("JaVaScRiPt:alert(1)")).toBe("/");
  });

  it("rejects backslash variants that browsers normalize to //", () => {
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("\\\\evil.example")).toBe("/");
  });

  it("rejects whitespace and control characters", () => {
    expect(safeNextPath(" /account")).toBe("/");
    expect(safeNextPath("/account ")).toBe("/");
    expect(safeNextPath("/account\nLocation: https://evil.example")).toBe("/");
    expect(safeNextPath("/account\u0000")).toBe("/");
  });
});
