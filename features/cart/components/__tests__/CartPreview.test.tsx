// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => false };
});

import CartPreview from "../CartPreview";
import { useCartStore } from "@/lib/store/cart-store";

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
    quantity: 1,
  },
];

afterEach(() => {
  cleanup();
  useCartStore.setState({ items: [] });
});

describe("CartPreview header total", () => {
  it("renders the price with tabular figures", () => {
    useCartStore.setState({ items: ITEMS });

    const { getByText } = render(<CartPreview />);
    // Two $68.00 + $12.00 lines total $80.00, which only appears in the
    // header, so this element is unambiguously the header total.
    const total = getByText("$80.00");

    expect(total).toBeInTheDocument();
    expect(total.className).toContain("tabular-nums");
  });
});
