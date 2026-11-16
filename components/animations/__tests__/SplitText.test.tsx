// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reducedMotion: false,
  split: vi.fn(),
  fromTo: vi.fn(),
  revert: vi.fn(),
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mocks.reducedMotion };
});

/**
 * Mirrors @gsap/react's default: the callback re-runs when dependencies
 * change, but the previous context cleanup only runs on unmount. That is what
 * lets the reduced-motion toggle test observe whether the component reverts
 * the live split itself.
 */
vi.mock("@gsap/react", async () => {
  const ReactMod = await import("react");
  return {
    useGSAP: (
      callback: () => void | (() => void),
      config?: { dependencies?: unknown[] },
    ) => {
      const cleanupRef = ReactMod.useRef<undefined | (() => void)>(undefined);

      ReactMod.useEffect(() => {
        cleanupRef.current = callback() ?? undefined;
      }, config?.dependencies ?? []);

      ReactMod.useEffect(() => () => {
        cleanupRef.current?.();
      }, []);
    },
  };
});

vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: vi.fn(),
    fromTo: mocks.fromTo,
  },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: { getAll: () => [] },
}));

vi.mock("gsap/SplitText", () => ({
  SplitText: class MockSplitText {
    chars: Element[] = [];
    words: Element[] = [];
    lines: Element[] = [];

    constructor(
      el: Element,
      options?: { onSplit?: (self: MockSplitText) => void },
    ) {
      mocks.split(el);
      options?.onSplit?.(this);
    }

    revert() {
      mocks.revert();
    }
  },
}));

import SplitText from "../SplitText";

afterEach(cleanup);

beforeEach(() => {
  mocks.reducedMotion = false;
  mocks.split.mockClear();
  mocks.fromTo.mockClear();
  mocks.revert.mockClear();
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { status: "loaded", ready: Promise.resolve() },
  });
});

describe("SplitText reduced-motion gate", () => {
  it("renders the authored text with no split, tween, or willChange", () => {
    mocks.reducedMotion = true;
    const { container } = render(<SplitText text="Slow goods" tag="h2" />);

    const heading = container.querySelector("h2");
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe("Slow goods");
    expect(heading?.style.willChange).toBe("");
    expect(mocks.split).not.toHaveBeenCalled();
    expect(mocks.fromTo).not.toHaveBeenCalled();
    expect(
      container.querySelector(".split-char, .split-word, .split-line"),
    ).toBeNull();
  });

  it("splits and tweens when motion is allowed", () => {
    const { container } = render(<SplitText text="Slow goods" tag="h2" />);

    const heading = container.querySelector("h2");
    expect(heading?.style.willChange).toBe("transform, opacity");
    expect(mocks.split).toHaveBeenCalledTimes(1);
    expect(mocks.fromTo).toHaveBeenCalledTimes(1);
  });

  it("reverts an existing split when reduced motion turns on", () => {
    const { container, rerender } = render(
      <SplitText text="Slow goods" tag="h2" />,
    );
    expect(mocks.split).toHaveBeenCalledTimes(1);
    expect(mocks.revert).not.toHaveBeenCalled();

    mocks.reducedMotion = true;
    rerender(<SplitText text="Slow goods" tag="h2" />);

    // The live split is undone, not just skipped: authored text comes back.
    expect(mocks.revert).toHaveBeenCalledTimes(1);
    expect(container.querySelector("h2")?.style.willChange).toBe("");
  });
});
