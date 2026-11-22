// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import type { ForwardedRef, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Hero rendered-output snapshot.
 *
 * Nondeterminism is mocked at the source (mirrors Hero.test.tsx):
 * - `motion/react` -> plain tags with animation props stripped, so the
 *   snapshot captures structure/classes/copy instead of inline animation
 *   state. `useReducedMotion` stays false to keep the `data-reveal`
 *   choreography path in the snapshot.
 * - `Stack` (drag physics, autoplay timers) and `BlurText`
 *   (IntersectionObserver, staggered keyframes) render their content plainly.
 *
 * Normalization (below): Next optimizer URLs are decoded to their source
 * path and `srcset` is dropped (derived, width-dependent), generated ids are
 * masked. Everything else snapshots verbatim.
 */

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  const ReactMod = await import("react");

  const MOTION_ONLY = new Set([
    "whileHover",
    "whileTap",
    "whileInView",
    "transition",
    "initial",
    "animate",
    "exit",
    "variants",
    "viewport",
    "style",
  ]);

  function makeStub(tag: string) {
    return ReactMod.forwardRef(function MotionStub(
      { children, ...props }: { children?: ReactNode } & Record<string, unknown>,
      ref: ForwardedRef<unknown>,
    ) {
      const domProps = Object.fromEntries(
        Object.entries(props).filter(([key]) => !MOTION_ONLY.has(key)),
      );
      return ReactMod.createElement(tag, { ...domProps, ref }, children);
    });
  }

  return {
    ...actual,
    useReducedMotion: () => false,
    motion: new Proxy(
      {},
      {
        get: (_target, prop) =>
          typeof prop === "string" ? makeStub(prop) : undefined,
      },
    ),
  };
});

vi.mock("@/components/animations/Stack", () => ({
  default: ({
    cards,
  }: {
    cards?: ReactNode[];
  }) => {
    const list = cards ?? [];
    return (
      <div data-testid="hero-deck">
        {list.map((card, index) => (
          <div key={index} data-testid="hero-deck-card">
            {card}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock("@/components/animations/BlurText", () => ({
  default: ({ text }: { text?: string }) => <h1>{text}</h1>,
}));

import Hero from "../Hero";

afterEach(cleanup);

/** Strip framework-derived values so consecutive runs are byte-identical. */
function normalize(html: string): string {
  return (
    html
      // Next optimizer URL -> source asset path.
      .replaceAll(/\/_next\/image\?url=([^&"'\s]+)[^"'\s]*/g, (_match, url: string) =>
        decodeURIComponent(url),
      )
      // Derived responsive set; `src` + `sizes` + `loading` stay asserted.
      .replaceAll(/\s+srcset="[^"]*"/g, "")
      // React / Radix generated ids.
      .replaceAll(/:r\d+:/g, "STABLE-ID")
      .replaceAll(/radix-[A-Za-z0-9-]+/g, "radix-STABLE-ID")
  );
}

describe("Hero snapshot", () => {
  it("matches the rendered output (structure, copy, tokens)", () => {
    const { container } = render(<Hero />);
    const html = normalize(container.innerHTML);

    // TDD-adjacent read-once check: the snapshot must capture the real
    // contract — headline, CTAs, proof row, four deck images.
    expect(html).toContain("Things worth keeping.");
    expect(html).toContain("Browse products");
    expect(html).toContain("Bestsellers");
    expect(html).toContain("hero-proof");
    expect(container.querySelectorAll("img")).toHaveLength(4);

    expect(html).toMatchSnapshot();
  });
});
