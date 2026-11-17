// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClearCartOnSuccess } from "../ClearCartOnSuccess";
import { useCartStore } from "@/lib/store/cart-store";

const ITEM_A = {
  variantId: "variant-a",
  productSlug: "product-a",
  title: "Product A",
  priceCents: 1000,
  image: "/a.webp",
};

const ITEM_B = {
  variantId: "variant-b",
  productSlug: "product-b",
  title: "Product B",
  priceCents: 2000,
  image: "/b.webp",
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  useCartStore.setState({ items: [], selectedVariantIds: undefined });
});

afterEach(cleanup);

describe("ClearCartOnSuccess", () => {
  it("removes only the purchased lines and leaves unchecked ones behind", () => {
    useCartStore.setState({
      items: [
        { ...ITEM_A, quantity: 2 },
        { ...ITEM_B, quantity: 1 },
      ],
    });

    render(<ClearCartOnSuccess orderId="order-1" variantIds={["variant-a"]} />);

    expect(useCartStore.getState().items).toEqual([
      { ...ITEM_B, quantity: 1 },
    ]);
    expect(sessionStorage.getItem("cart-cleared:order-1")).toBe("1");
  });

  it("does not touch the cart again on revisit", () => {
    useCartStore.setState({ items: [{ ...ITEM_A, quantity: 1 }] });
    render(<ClearCartOnSuccess orderId="order-1" variantIds={["variant-a"]} />);
    expect(useCartStore.getState().items).toEqual([]);

    // Shopper adds something new, then revisits the old success page.
    useCartStore.setState({ items: [{ ...ITEM_B, quantity: 3 }] });
    render(<ClearCartOnSuccess orderId="order-1" variantIds={["variant-a"]} />);

    expect(useCartStore.getState().items).toEqual([
      { ...ITEM_B, quantity: 3 },
    ]);
  });

  it("tracks cleared orders independently", () => {
    useCartStore.setState({
      items: [
        { ...ITEM_A, quantity: 1 },
        { ...ITEM_B, quantity: 1 },
      ],
    });
    render(<ClearCartOnSuccess orderId="order-1" variantIds={["variant-a"]} />);
    expect(
      useCartStore.getState().items.map((item) => item.variantId),
    ).toEqual(["variant-b"]);

    render(<ClearCartOnSuccess orderId="order-2" variantIds={["variant-b"]} />);
    expect(useCartStore.getState().items).toEqual([]);
  });
});
