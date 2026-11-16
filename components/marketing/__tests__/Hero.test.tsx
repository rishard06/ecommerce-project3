// @vitest-environment jsdom
import { existsSync } from "node:fs";
import path from "node:path";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Landing deck imagery ships from the repo, not from a hotlinked host:
 * every hero card must resolve to a real local WebP under `public/landing/`,
 * carry a descriptive alt, and keep `priority` on the first card only.
 *
 * The decorative animation wrappers are mocked so this test stays focused on
 * the deck contract instead of motion timing.
 */
vi.mock("@/components/animations/Stack", () => ({
  default: ({ cards }: { cards?: ReactNode[] }) => (
    <div data-testid="hero-deck">{cards}</div>
  ),
}));

vi.mock("@/components/animations/BlurText", () => ({
  default: ({ text }: { text?: string }) => <h1>{text}</h1>,
}));

import Hero from "../Hero";

afterEach(cleanup);

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
