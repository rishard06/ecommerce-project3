// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCartStore } from "@/lib/store/cart-store";

/**
 * CheckoutSummary rendered-output snapshot.
 *
 * No animation or timing sources: totals are pure integer-cent math
 * (`getOrderTotals`), prices format via `Intl` (`en-US`, pinned by the
 * `formatCents` boundary), and the cart is seeded with fixed fixtures before
 * each render. Three states snapshot the full visual surface: populated,
 * empty cart, and cart-with-nothing-selected.
 */

import { CheckoutSummary } from "../CheckoutSummary";

const ITEMS = [
  {
    variantId: "variant-93",
    productSlug: "dummy-93",
    title: "Felted wool throw",
    priceCents: 6800,
    image: "/landing/deck-1.webp",
    quantity: 1,
  },
  {
    variantId: "variant-12",
    productSlug: "dummy-12",
    title: "Stoneware mug",
    priceCents: 1200,
    image: "/landing/deck-2.webp",
    quantity: 2,
  },
];

afterEach(() => {
  cleanup();
  useCartStore.setState({ items: [], selectedVariantIds: undefined });
});

/** Strip framework-derived values so consecutive runs are byte-identical. */
function normalize(html: string): string {
  return (
    html
      .replaceAll(/\/_next\/image\?url=([^&"'\s]+)[^"'\s]*/g, (_match, url: string) =>
        decodeURIComponent(url),
      )
      .replaceAll(/\s+srcset="[^"]*"/g, "")
      .replaceAll(/:r\d+:/g, "STABLE-ID")
      .replaceAll(/radix-[A-Za-z0-9-]+/g, "radix-STABLE-ID")
  );
}

describe("CheckoutSummary snapshot", () => {
  it("matches the populated order summary", () => {
    useCartStore.setState({ items: ITEMS });

    const { container } = render(<CheckoutSummary />);
    const html = normalize(container.innerHTML);

    // 6800 + 2×1200 = $92.00 subtotal; read-once check the money rendered.
    expect(html).toContain("$92.00");
    expect(html).toContain("Order summary");

    expect(html).toMatchSnapshot();
  });

  it("matches the empty-cart state", () => {
    const { container } = render(<CheckoutSummary />);
    const html = normalize(container.innerHTML);

    expect(html).toContain("Your cart is empty");

    expect(html).toMatchSnapshot();
  });

  it("matches the nothing-selected state", () => {
    useCartStore.setState({ items: ITEMS, selectedVariantIds: [] });

    const { container } = render(<CheckoutSummary />);
    const html = normalize(container.innerHTML);

    expect(html).toContain("No items selected");

    expect(html).toMatchSnapshot();
  });
});
