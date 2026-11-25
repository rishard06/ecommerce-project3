import { describe, expect, it } from "vitest";

import type { StorefrontProductSummary } from "@/features/catalog/server/catalog-view";
import {
  LANDING_CAROUSEL_LIMIT,
  toLandingCarouselSlides,
} from "../landing-carousel-data";

function summary(
  index: number,
  overrides: Partial<StorefrontProductSummary> = {},
): StorefrontProductSummary {
  return {
    slug: `product-${index}`,
    title: `Product ${index}`,
    description: `Description ${index}`,
    priceCents: 1000 + index,
    image: `/landing/product-${index}.webp`,
    rating: 5 - index / 10,
    categorySlug: "home",
    categoryName: "Home",
    defaultVariantId: `variant-${index}`,
    isPopular: true,
    ...overrides,
  };
}

function eightProducts(): StorefrontProductSummary[] {
  return Array.from({ length: 8 }, (_, index) => summary(index + 1));
}

describe("toLandingCarouselSlides", () => {
  it("maps eight featured products in query order", () => {
    const slides = toLandingCarouselSlides(eightProducts());

    expect(LANDING_CAROUSEL_LIMIT).toBe(8);
    expect(slides).toHaveLength(8);
    expect(slides.map((slide) => slide.slug)).toEqual([
      "product-1",
      "product-2",
      "product-3",
      "product-4",
      "product-5",
      "product-6",
      "product-7",
      "product-8",
    ]);
  });

  it("keeps the real image url and formats the price from cents", () => {
    const [slide] = toLandingCarouselSlides([
      summary(1, { image: "https://cdn.example.com/real.webp", priceCents: 6800 }),
    ]);

    expect(slide.image).toBe("https://cdn.example.com/real.webp");
    expect(slide.price).toBe("$68.00");
    expect(slide.categoryName).toBe("Home");
    expect(slide.alt).toContain("Product 1");
  });

  it("falls back to the placeholder when the image url is empty or blank", () => {
    const slides = toLandingCarouselSlides([
      summary(1, { image: "" }),
      summary(2, { image: "   " }),
    ]);

    expect(slides.map((slide) => slide.image)).toEqual([null, null]);
    expect(slides[0].title).toBe("Product 1");
  });

  it("never returns more slides than the carousel limit", () => {
    const products = Array.from({ length: 11 }, (_, index) => summary(index + 1));

    expect(toLandingCarouselSlides(products)).toHaveLength(LANDING_CAROUSEL_LIMIT);
  });

  it("returns an empty list when the catalog has no featured products", () => {
    expect(toLandingCarouselSlides([])).toEqual([]);
  });
});
