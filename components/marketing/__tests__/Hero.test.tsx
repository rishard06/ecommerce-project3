// @vitest-environment jsdom
import { existsSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => mocks.reducedMotion };
});

vi.mock("@/components/animations/Stack", () => ({
  default: ({
    cards,
    onFirstInteract,
    renderTopCardLink,
  }: {
    cards?: ReactNode[];
    onFirstInteract?: () => void;
    renderTopCardLink?: (content: ReactNode, cardIndex: number) => ReactNode;
  }) => {
    const list = cards ?? [];
    return (
      <div data-testid="hero-deck">
        {list.map((card, index) => (
          <div key={index} data-testid="hero-deck-card">
            {index === list.length - 1 && renderTopCardLink
              ? renderTopCardLink(card, index)
              : card}
          </div>
        ))}
        <button
          type="button"
          data-testid="deck-first-interact"
          aria-label="Simulate deck interaction"
          onClick={() => onFirstInteract?.()}
        />
      </div>
    );
  },
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

/** Next/Image may wrap a local source in the optimizer URL during tests. */
function imageSource(src: string): string {
  if (src.startsWith("/_next/image")) {
    return new URL(src, "http://localhost").searchParams.get("url") ?? src;
  }
  return src;
}

function deckImages(container: HTMLElement): HTMLImageElement[] {
  return Array.from(
    container.querySelectorAll<HTMLImageElement>(
      '[data-testid="hero-deck"] img',
    ),
  );
}

describe("Hero shoppable deck", () => {
  it("serves every card from a local /landing/ WebP asset (zero hotlinks)", () => {
    const { container } = render(<Hero />);
    const images = deckImages(container);
    expect(images).toHaveLength(4);

    for (const image of images) {
      const raw = image.getAttribute("src") ?? "";
      expect(raw.startsWith("http")).toBe(false);

      const localPath = imageSource(raw);
      expect(localPath).toMatch(/^\/landing\/[a-z0-9-]+\.webp$/);
      expect(
        existsSync(path.join(process.cwd(), "public", localPath)),
        `${localPath} should exist in public/`,
      ).toBe(true);
    }
  });

  it("keeps the deck as pure image browsing (no product links)", () => {
    const { container } = render(<Hero />);
    const deck = container.querySelector('[data-testid="hero-deck"]');
    const links = Array.from(
      deck?.querySelectorAll('a[href^="/products/"]') ?? [],
    );

    // Drag/click browses images only — no card navigates anywhere.
    expect(links).toHaveLength(0);
    expect(deckImages(container)).toHaveLength(4);
  });

  it("shows a drag hint that dismisses after the first deck interaction", () => {
    const { getByTestId, getByText } = render(<Hero />);

    expect(getByText(/drag to explore/i)).toBeTruthy();
    expect(getByTestId("deck-hint").getAttribute("aria-hidden")).toBe("false");

    fireEvent.click(getByTestId("deck-first-interact"));

    expect(getByTestId("deck-hint").getAttribute("aria-hidden")).toBe("true");
  });
});
