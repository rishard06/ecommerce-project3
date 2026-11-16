// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mocks.reducedMotion };
});

vi.mock("@/components/animations/Stack", () => ({
  default: ({ cards }: { cards?: ReactNode[] }) => (
    <div data-testid="hero-deck">{cards}</div>
  ),
}));

vi.mock("@/components/animations/BlurText", () => ({
  default: ({ text }: { text?: string }) => <h1>{text}</h1>,
}));

import Hero from "../Hero";
import { REVEAL_STAGGER_MS, revealDelay } from "@/components/animations/Reveal";

afterEach(cleanup);

beforeEach(() => {
  mocks.reducedMotion = false;
});

function revealElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-reveal]"));
}

describe("Hero reveal choreography", () => {
  it("marks headline, subcopy, CTA and deck as one ordered sequence", () => {
    const { container } = render(<Hero />);
    const order = revealElements(container).map((element) =>
      Number(element.getAttribute("data-reveal")),
    );

    expect(order).toEqual([0, 1, 2, 3]);
  });

  it("keeps the sequence aligned with reading order", () => {
    const { container } = render(<Hero />);
    const [headline, subcopy, cta, deck] = revealElements(container);

    expect(headline.querySelector("h1")?.textContent).toContain(
      "Things worth keeping.",
    );
    expect(subcopy.textContent).toContain("A small shop");
    expect(cta.textContent).toContain("Browse products");
    expect(deck.querySelector('[data-testid="hero-deck"]')).not.toBeNull();
  });

  it("starts each step 60ms after the previous one", () => {
    expect(REVEAL_STAGGER_MS).toBe(60);
    expect([0, 1, 2, 3].map(revealDelay)).toEqual([0, 60, 120, 180]);
  });

  it("renders the hero static when prefers-reduced-motion is set", () => {
    mocks.reducedMotion = true;
    const { container, getByRole } = render(<Hero />);

    expect(revealElements(container)).toHaveLength(0);
    expect(
      getByRole("heading", { name: /things worth keeping/i }),
    ).toBeTruthy();
    expect(getByRole("link", { name: /browse products/i })).toBeTruthy();
    expect(container.querySelector('[data-testid="hero-deck"]')).not.toBeNull();
  });
});
