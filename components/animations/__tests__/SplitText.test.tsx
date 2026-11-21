// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reducedMotion: false,
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mocks.reducedMotion };
});

import SplitText from "../SplitText";

afterEach(cleanup);

beforeEach(() => {
  mocks.reducedMotion = false;
});

describe("SplitText reduced-motion gate", () => {
  it("renders the authored text with no split or willChange", () => {
    mocks.reducedMotion = true;
    const { container } = render(<SplitText text="Slow goods" tag="h2" />);

    const heading = container.querySelector("h2");
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe("Slow goods");
    expect(heading?.style.willChange).toBe("");
    expect(
      container.querySelector(".split-char, .split-word, .split-line"),
    ).toBeNull();
  });

  it("splits and animates when motion is allowed", () => {
    const { container } = render(<SplitText text="Slow goods" tag="h2" />);

    const heading = container.querySelector("h2");
    expect(heading?.style.willChange).toBe("transform, opacity");
    expect(
      container.querySelector(".split-char, .split-word"),
    ).not.toBeNull();
  });
});
