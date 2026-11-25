import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StorefrontProductSummary } from "@/features/catalog/server/catalog-view";
import LandingCarouselSlides from "../LandingCarouselSlides";
import { toLandingCarouselSlides } from "../landing-carousel-data";

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

function renderSlides(products: StorefrontProductSummary[]): string {
  return renderToStaticMarkup(
    <LandingCarouselSlides slides={toLandingCarouselSlides(products)} />,
  );
}

describe("LandingCarouselSlides", () => {
  it("links every slide to its product detail page", () => {
    const html = renderSlides([summary(1), summary(2)]);

    expect(html).toContain('href="/products/product-1"');
    expect(html).toContain('href="/products/product-2"');
    expect(html).toContain('aria-label="View Product 1"');
  });

  it("renders an accessible dot per slide", () => {
    const html = renderSlides([summary(1), summary(2)]);

    expect(html).toContain('aria-label="Show slide 1: Product 1"');
    expect(html).toContain('aria-label="Show slide 2: Product 2"');
    expect(html).toContain('aria-current="true"');
  });

  it("renders the placeholder instead of an image when the url is empty", () => {
    const html = renderSlides([summary(1, { image: "" })]);

    expect(html).toContain("No product image available");
    expect(html).not.toContain("<img");
  });
});
