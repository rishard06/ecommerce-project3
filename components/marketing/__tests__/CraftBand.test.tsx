// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import CraftBand from "../CraftBand";

afterEach(cleanup);

describe("CraftBand", () => {
  it("renders an editorial heading", () => {
    const { getByRole } = render(<CraftBand />);
    expect(
      getByRole("heading", { name: /made to be kept/i }),
    ).toBeTruthy();
  });

  it("renders the craft image with a descriptive alt", () => {
    const { getByRole } = render(<CraftBand />);
    const image = getByRole("img");
    const raw = image.getAttribute("src") ?? "";
    // Next/Image may wrap a local source in the optimizer URL during tests.
    const localPath = raw.startsWith("/_next/image")
      ? (new URL(raw, "http://localhost").searchParams.get("url") ?? raw)
      : raw;

    expect(localPath).toBe("/landing/craft.webp");
    expect((image.getAttribute("alt") ?? "").length).toBeGreaterThan(10);
  });

  it("renders a subordinate text link to an existing route", () => {
    const { getByRole } = render(<CraftBand />);
    const link = getByRole("link", { name: /browse the collection/i });

    expect(link.getAttribute("href")).toBe("/products");
  });
});
