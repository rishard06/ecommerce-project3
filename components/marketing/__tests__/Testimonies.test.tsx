// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Testimonies from "../Testimonies";

/**
 * Landing social proof must describe the current catalog, not the old
 * audio-gear story. Every card names and links a real seeded product slug,
 * avatars are local (initials) with a descriptive accessible name, and the
 * retired headphone/DJ vocabulary is gone.
 */

afterEach(cleanup);

const catalogTestimonials = [
  { name: "Amara Okafor", product: "Rolex Submariner Watch", slug: "dummy-98" },
  { name: "Daniel Kim", product: "Tennis Racket", slug: "dummy-152" },
  { name: "Priya Nair", product: "iPhone 13 Pro", slug: "dummy-123" },
  { name: "Marcus Bell", product: "Basketball", slug: "dummy-140" },
] as const;

const bannedTerms = [
  "headphone",
  "microphone",
  "dj",
  "studio session",
  "tour",
];

function renderCards(): HTMLElement[] {
  const { container } = render(<Testimonies />);
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="card"]'),
  );
}

function findCard(cards: HTMLElement[], name: string): HTMLElement | undefined {
  return cards.find((card) => card.textContent?.includes(name));
}

describe("Testimonies", () => {
  it("removes the retired audio-gear vocabulary", () => {
    const { container } = render(<Testimonies />);
    const copy = (container.textContent ?? "").toLowerCase();

    for (const term of bannedTerms) {
      expect(copy, `"${term}" should not appear in testimonial copy`).not.toContain(
        term,
      );
    }
  });

  it("renders four cards that each link to a real catalog product slug", () => {
    const cards = renderCards();
    expect(cards).toHaveLength(4);

    for (const expected of catalogTestimonials) {
      const card = findCard(cards, expected.name);
      expect(card, `${expected.name} card should render`).toBeDefined();

      const link = within(card!).getByRole("link", {
        name: new RegExp(expected.product, "i"),
      });
      expect(link.getAttribute("href")).toBe(`/products/${expected.slug}`);
    }
  });

  it("names the catalog product inside every quote", () => {
    const cards = renderCards();

    for (const expected of catalogTestimonials) {
      const quote = findCard(cards, expected.name)?.querySelector("blockquote");

      expect(quote, `${expected.name} should have a quote`).not.toBeNull();
      expect(quote?.textContent?.toLowerCase()).toContain(
        expected.product.toLowerCase(),
      );
    }
  });

  it("gives every avatar a descriptive accessible name and no remote image", () => {
    const cards = renderCards();

    for (const expected of catalogTestimonials) {
      const card = findCard(cards, expected.name);
      expect(card, `${expected.name} card should render`).toBeDefined();
      expect(card!.querySelector('img[src^="http"]')).toBeNull();
      expect(
        within(card!).getByRole("img", {
          name: `Portrait of ${expected.name}`,
        }),
      ).toBeDefined();
    }
  });

  it("keeps the five-star rating on every card", () => {
    for (const card of renderCards()) {
      expect(
        within(card).getByRole("img", { name: "Rated 5 out of 5" }),
      ).toBeDefined();
    }
    expect(screen.getAllByRole("img", { name: "Rated 5 out of 5" })).toHaveLength(
      4,
    );
  });
});
