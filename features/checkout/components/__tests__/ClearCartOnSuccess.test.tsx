// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
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

  it("ignores renders with no purchased ids without marking the order cleared", () => {
    useCartStore.setState({ items: [{ ...ITEM_A, quantity: 1 }] });

    render(<ClearCartOnSuccess orderId="order-1" variantIds={[]} />);

    expect(useCartStore.getState().items).toEqual([{ ...ITEM_A, quantity: 1 }]);
    expect(sessionStorage.getItem("cart-cleared:order-1")).toBeNull();

    // A later render that does carry purchased ids still clears.
    render(<ClearCartOnSuccess orderId="order-1" variantIds={["variant-a"]} />);
    expect(useCartStore.getState().items).toEqual([]);
    expect(sessionStorage.getItem("cart-cleared:order-1")).toBe("1");
  });

  it("marks the order cleared without rewriting the cart when lines are already gone", () => {
    useCartStore.setState({ items: [{ ...ITEM_B, quantity: 3 }] });

    render(<ClearCartOnSuccess orderId="order-1" variantIds={["variant-a"]} />);

    expect(useCartStore.getState().items).toEqual([{ ...ITEM_B, quantity: 3 }]);
    expect(sessionStorage.getItem("cart-cleared:order-1")).toBe("1");
  });

  it("clears purchased lines when rehydration lands after mount", async () => {
    vi.resetModules();
    const { useCartStore: freshStore } = await import(
      "@/lib/store/cart-store"
    );
    const { ClearCartOnSuccess: FreshClear } = await import(
      "../ClearCartOnSuccess"
    );

    // Deferred async storage: hydration completes only when released.
    let release!: (v: { state: unknown; version: number } | null) => void;
    const gate = new Promise<{ state: unknown; version: number } | null>(
      (resolve) => {
        release = resolve;
      },
    );
    freshStore.persist.setOptions({
      storage: {
        getItem: () => gate,
        setItem: () => {},
        removeItem: () => {},
      } as never,
    });
    const rehydration = freshStore.persist.rehydrate();
    expect(freshStore.persist.hasHydrated()).toBe(false);

    freshStore.setState({ items: [], selectedVariantIds: undefined });
    render(<FreshClear orderId="order-9" variantIds={["variant-a"]} />);

    // The stored cart arrives after mount.
    await act(async () => {
      release({
        state: {
          items: [
            { ...ITEM_A, quantity: 2 },
            { ...ITEM_B, quantity: 1 },
          ],
        },
        version: 2,
      });
      await rehydration;
    });

    await waitFor(() => {
      expect(freshStore.getState().items).toEqual([{ ...ITEM_B, quantity: 1 }]);
    });
    expect(sessionStorage.getItem("cart-cleared:order-9")).toBe("1");
  });
});
