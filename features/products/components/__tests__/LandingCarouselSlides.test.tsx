// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StorefrontProductSummary } from "@/features/catalog/server/catalog-view";
import LandingCarouselSlides from "../LandingCarouselSlides";
import { toLandingCarouselSlides } from "../landing-carousel-data";

/**
 * Embla (via the shared Carousel) observes slides with ResizeObserver, which
 * jsdom does not implement. A no-op observer is enough: these tests assert the
 * rendered slide semantics, not layout.
 */
class ResizeObserverStub implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

/**
 * Embla also evaluates media-query options through `window.matchMedia` and
 * watches slide visibility with IntersectionObserver, neither of which jsdom
 * implements. No-op shims keep the real carousel mounted.
 */
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}));

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  },
);

afterEach(cleanup);

function summary(
  index: number,
  overrides: Partial<StorefrontProductSummary> = {},
): StorefrontProductSummary {
  return {
    slug: `product-${index}`,
    title: `Product ${index}`,
    description: `Description ${index}`,
    priceCents: 6800,
    image: `/landing/product-${index}.webp`,
    rating: 5,
    categorySlug: "home",
    categoryName: "Home",
    defaultVariantId: `variant-${index}`,
    isPopular: true,
    ...overrides,
  };
}

function renderSlides(products: StorefrontProductSummary[]) {
  return render(
    <LandingCarouselSlides slides={toLandingCarouselSlides(products)} />,
  );
}

describe("LandingCarouselSlides", () => {
  it("links every slide to its product detail page", () => {
    renderSlides([summary(1), summary(2)]);

    expect(
      screen.getByRole("link", { name: "View Product 1" }).getAttribute("href"),
    ).toBe("/products/product-1");
    expect(
      screen.getByRole("link", { name: "View Product 2" }).getAttribute("href"),
    ).toBe("/products/product-2");
  });

  it("renders an accessible dot per slide and marks the active one", () => {
    renderSlides([summary(1), summary(2)]);

    const first = screen.getByRole("button", {
      name: "Show slide 1: Product 1",
    });
    const second = screen.getByRole("button", {
      name: "Show slide 2: Product 2",
    });

    expect(first.getAttribute("aria-current")).toBe("true");
    expect(second.getAttribute("aria-current")).toBeNull();
  });

  it("renders the placeholder instead of an image when the url is empty", () => {
    const { container } = renderSlides([summary(1, { image: "" })]);

    expect(screen.getByText("No product image available")).toBeDefined();
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});
