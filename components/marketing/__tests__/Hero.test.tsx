// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
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
  }: {
    cards?: ReactNode[];
    onFirstInteract?: () => void;
  }) => {
    const list = cards ?? [];
    return (
      <div data-testid="hero-deck">
        {list.map((card, index) => (
          <div key={index} data-testid="hero-deck-card">
            {card}
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

/** Next/Image may wrap a local source in the optimizer URL during tests. */
function imageSource(src: string): string {
  if (src.startsWith("/_next/image")) {
    return new URL(src, "http://localhost").searchParams.get("url") ?? src;
  }
  return src;
}

function renderDeckImages() {
  const { container } = render(<Hero />);
  return Array.from(
    container.querySelectorAll<HTMLImageElement>('[data-testid="hero-deck"] img'),
  );
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

describe("Hero landing deck", () => {
  it("renders four cards", () => {
    expect(renderDeckImages()).toHaveLength(4);
  });

  it("serves every card from a local /landing/ WebP asset that exists", () => {
    const images = renderDeckImages();
    expect(images).toHaveLength(4);

    for (const image of images) {
      const src = image.getAttribute("src") ?? "";
      expect(src.startsWith("http")).toBe(false);

      const localPath = imageSource(src);
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
    expect(
      deck?.querySelectorAll("img") ?? [],
    ).toHaveLength(4);
  });

  it("gives every card a unique, descriptive alt", () => {
    const images = renderDeckImages();
    const alts = images.map((image) => image.getAttribute("alt") ?? "");

    for (const alt of alts) {
      expect(alt.trim().length).toBeGreaterThan(15);
    }
    expect(new Set(alts).size).toBe(alts.length);
  });

  it("keeps priority on the first card only", () => {
    const images = renderDeckImages();

    // `priority` opts an image out of lazy loading; the rest stay lazy.
    expect(images[0].getAttribute("loading")).not.toBe("lazy");
    for (const image of images.slice(1)) {
      expect(image.getAttribute("loading")).toBe("lazy");
    }
  });

  it("shows a drag hint that dismisses after the first deck interaction", () => {
    const { getByTestId, getByText } = render(<Hero />);

    expect(getByText(/drag to explore/i)).toBeTruthy();
    expect(getByTestId("deck-hint").getAttribute("aria-hidden")).toBe("false");

    fireEvent.click(getByTestId("deck-first-interact"));

    expect(getByTestId("deck-hint").getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Hero proof row", () => {
  it("renders three proof items beneath the Browse products CTA", () => {
    const { container, getByRole } = render(<Hero />);
    const cta = getByRole("link", { name: /browse products/i });
    const row = container.querySelector('[data-testid="hero-proof"]');

    expect(row).not.toBeNull();
    const text = row?.textContent ?? "";
    expect(text).toContain("5-star");
    expect(text).toContain("30-day returns");
    expect(text).toContain("Ships same day");

    // Document order keeps the proof row below the CTA it supports.
    expect(
      cta.compareDocumentPosition(row as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps proof items as plain text instead of links", () => {
    const { container } = render(<Hero />);
    const row = container.querySelector('[data-testid="hero-proof"]');

    expect(row).not.toBeNull();
    expect(row?.querySelectorAll("a")).toHaveLength(0);
    expect(row?.querySelectorAll("button")).toHaveLength(0);
  });
});

describe("Hero secondary CTA", () => {
  it("adds a subordinate Bestsellers link next to the primary button", () => {
    const { getByRole } = render(<Hero />);
    const primaryLink = getByRole("link", { name: /browse products/i });
    const primaryButton = getByRole("button", { name: /browse products/i });
    const secondary = getByRole("link", { name: /bestsellers/i });

    expect(secondary.getAttribute("href")).toBe("#featured");

    // Keep the accent fill as the only primary action on the hero.
    expect(primaryButton.className).toContain("bg-accent-500");
    expect(secondary.className).not.toContain("bg-accent-500");
    expect(secondary.className).not.toContain("shadow-soft");

    // Reading order: primary first, quiet link after it.
    expect(
      primaryLink.compareDocumentPosition(secondary) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("targets a #featured section that actually exists", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "features",
        "products",
        "components",
        "FeatureProducts.tsx",
      ),
      "utf8",
    );

    expect(source).toMatch(/id="featured"/);
  });
});
