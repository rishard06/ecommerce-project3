// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 07: the product detail page emits schema.org `Product` JSON-LD built
 * from the product it already fetched. The script must carry name, image,
 * price, currency, availability, and a product URL — and must stay safe when
 * catalog copy contains markup.
 */

const mocks = vi.hoisted(() => ({
  getProduct: vi.fn(),
  getProducts: vi.fn(),
}));

vi.mock("@/lib/products", () => ({
  getProduct: mocks.getProduct,
  getProducts: mocks.getProducts,
}));

vi.mock("@/features/products/ProductDetailPage", () => ({
  ProductDetailPage: () => <div data-testid="product-detail" />,
}));

import Page from "./page";

const PRODUCT = {
  slug: "alpha-product",
  title: "Alpha Product",
  description: "A considered everyday essential.",
  priceCents: 2999,
  rating: 4.8,
  categorySlug: "home",
  categoryName: "Home",
  defaultVariantId: "variant-1",
  isPopular: true,
  images: [
    "https://cdn.example.com/alpha-1.webp",
    "https://cdn.example.com/alpha-2.webp",
  ],
  features: ["Free shipping"],
  reviews: [],
  reviewCount: 0,
  variants: [
    { id: "variant-1", sku: "ALPHA-1", priceCents: 2999, onHand: 7 },
  ],
  defaultVariant: { id: "variant-1", sku: "ALPHA-1", priceCents: 2999, onHand: 7 },
};

function readJsonLd(container: HTMLElement): Record<string, unknown> {
  const script = container.querySelector(
    'script[type="application/ld+json"]',
  );
  expect(script).not.toBeNull();
  return JSON.parse(script!.textContent ?? "");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example/");
  mocks.getProduct.mockResolvedValue(PRODUCT);
  mocks.getProducts.mockResolvedValue({
    products: [],
    total: 0,
    skip: 0,
    take: 5,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("product detail JSON-LD", () => {
  it("emits a schema.org Product with price and availability", async () => {
    const ui = await Page({ params: Promise.resolve({ id: PRODUCT.slug }) });
    const { container } = render(ui);

    const jsonLd = readJsonLd(container);

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Alpha Product",
      description: "A considered everyday essential.",
      sku: "ALPHA-1",
      image: [
        "https://cdn.example.com/alpha-1.webp",
        "https://cdn.example.com/alpha-2.webp",
      ],
      offers: {
        "@type": "Offer",
        url: "https://shop.example/products/alpha-product",
        priceCurrency: "USD",
        price: "29.99",
        availability: "https://schema.org/InStock",
      },
    });
  });

  it("marks a sold-out default variant as OutOfStock", async () => {
    mocks.getProduct.mockResolvedValue({
      ...PRODUCT,
      defaultVariant: { ...PRODUCT.defaultVariant, onHand: 0 },
      variants: [{ ...PRODUCT.variants[0], onHand: 0 }],
    });

    const ui = await Page({ params: Promise.resolve({ id: PRODUCT.slug }) });
    const { container } = render(ui);

    expect(readJsonLd(container).offers).toMatchObject({
      availability: "https://schema.org/OutOfStock",
    });
  });

  it("escapes markup in catalog copy instead of closing the script tag", async () => {
    mocks.getProduct.mockResolvedValue({
      ...PRODUCT,
      description: "A perfectly safe </script><script>alert(1)</script> product.",
    });

    const ui = await Page({ params: Promise.resolve({ id: PRODUCT.slug }) });
    const { container } = render(ui);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script!.textContent).not.toContain("</script>");
    expect(readJsonLd(container).description).toBe(
      "A perfectly safe </script><script>alert(1)</script> product.",
    );
  });
});
