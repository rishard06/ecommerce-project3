import { beforeEach, describe, expect, it } from "vitest";
import {
  migrateCartState,
  useCartStore,
  type CartAddItem,
} from "../store/cart-store";

const variantA: CartAddItem = {
  variantId: "variant-a",
  productSlug: "dummy-1",
  title: "Product A",
  priceCents: 1999,
  image: "https://cdn.dummyjson.com/src/product-a.webp",
};

const variantB: CartAddItem = {
  variantId: "variant-b",
  productSlug: "dummy-2",
  title: "Product B",
  priceCents: 2450,
  image: "https://cdn.dummyjson.com/src/product-b.webp",
};

beforeEach(() => {
  useCartStore.setState({ items: [], selectedVariantIds: undefined });
});

describe("useCartStore", () => {
  it("adds a new variant as its own line with quantity 1", () => {
    useCartStore.getState().addItem(variantA);

    expect(useCartStore.getState().items).toEqual([
      { ...variantA, quantity: 1 },
    ]);
  });

  it("increments the existing line when the same variant is added twice", () => {
    const { addItem } = useCartStore.getState();
    addItem(variantA);
    addItem(variantA);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ ...variantA, quantity: 2 });
  });

  it("keeps distinct variants on separate lines", () => {
    const { addItem } = useCartStore.getState();
    addItem(variantA);
    addItem(variantB);
    addItem(variantA);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.variantId)).toEqual(["variant-a", "variant-b"]);
    expect(items.map((item) => item.quantity)).toEqual([2, 1]);
  });

  it("updates quantity by variantId", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(variantA);
    updateQuantity("variant-a", 5);

    expect(useCartStore.getState().items[0]?.quantity).toBe(5);
  });

  it("removes the line when the quantity drops to 0", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(variantA);
    addItem(variantB);
    updateQuantity("variant-a", 0);

    const { items } = useCartStore.getState();
    expect(items.map((item) => item.variantId)).toEqual(["variant-b"]);
  });

  it("removes only the targeted variant", () => {
    const { addItem, removeItem } = useCartStore.getState();
    addItem(variantA);
    addItem(variantB);
    removeItem("variant-a");

    const { items } = useCartStore.getState();
    expect(items.map((item) => item.variantId)).toEqual(["variant-b"]);
  });

  it("totals item quantities across lines", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(variantA);
    addItem(variantA);
    addItem(variantB);
    updateQuantity("variant-b", 4);

    expect(useCartStore.getState().getTotalItems()).toBe(6);
  });

  it("sums integer cents without float arithmetic", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(variantA);
    addItem(variantA);
    addItem(variantB);
    updateQuantity("variant-b", 3);

    const totalCents = useCartStore.getState().getTotalPriceCents();
    expect(totalCents).toBe(1999 * 2 + 2450 * 3);
    expect(Number.isInteger(totalCents)).toBe(true);
  });

  it("exposes a transitional float-dollar total derived from the cent total", () => {
    const { addItem } = useCartStore.getState();
    addItem(variantA);
    addItem(variantB);

    expect(useCartStore.getState().getTotalPrice()).toBe(44.49);
  });

  it("clears the cart", () => {
    const { addItem, clearCart } = useCartStore.getState();
    addItem(variantA);
    clearCart();

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().getTotalPriceCents()).toBe(0);
  });
});

describe("cart checkout selection", () => {
  it("selects everything by default, including legacy carts without the key", () => {
    const { addItem, isSelected, getSelectedItems } = useCartStore.getState();
    addItem(variantA);
    addItem(variantB);

    // Simulates a cart persisted before selection existed.
    useCartStore.setState({ selectedVariantIds: undefined });

    expect(isSelected("variant-a")).toBe(true);
    expect(isSelected("variant-b")).toBe(true);
    expect(getSelectedItems()).toHaveLength(2);
  });

  it("toggles a single line without touching the others", () => {
    const { addItem, toggleSelected, isSelected, getSelectedItems } =
      useCartStore.getState();
    addItem(variantA);
    addItem(variantB);

    toggleSelected("variant-a");

    expect(isSelected("variant-a")).toBe(false);
    expect(isSelected("variant-b")).toBe(true);
    expect(
      getSelectedItems().map((item) => item.variantId),
    ).toEqual(["variant-b"]);

    toggleSelected("variant-a");
    expect(isSelected("variant-a")).toBe(true);
  });

  it("selects and deselects everything at once", () => {
    const { addItem, setAllSelected, getSelectedItems } =
      useCartStore.getState();
    addItem(variantA);
    addItem(variantB);

    setAllSelected(false);
    expect(getSelectedItems()).toEqual([]);

    setAllSelected(true);
    expect(getSelectedItems()).toHaveLength(2);
  });

  it("keeps new lines checked and drops removed lines from the selection", () => {
    const { addItem, toggleSelected, removeItem, isSelected } =
      useCartStore.getState();
    addItem(variantA);
    addItem(variantB);
    toggleSelected("variant-a");

    addItem({ ...variantB, variantId: "variant-c", title: "Product C" });
    expect(isSelected("variant-c")).toBe(true);

    removeItem("variant-b");
    const state = useCartStore.getState();
    expect(state.selectedVariantIds).not.toContain("variant-b");
    expect(state.getSelectedItems().map((item) => item.variantId)).toEqual([
      "variant-c",
    ]);
  });

  it("totals only the selected lines", () => {
    const { addItem, toggleSelected } = useCartStore.getState();
    addItem(variantA);
    addItem(variantA);
    addItem(variantB);
    toggleSelected("variant-b");

    expect(useCartStore.getState().getSelectedPriceCents()).toBe(1999 * 2);
  });

  it("resets the selection when the cart is cleared", () => {
    const { addItem, toggleSelected, clearCart } = useCartStore.getState();
    addItem(variantA);
    toggleSelected("variant-a");

    clearCart();

    expect(useCartStore.getState().selectedVariantIds).toBeUndefined();
  });
});

describe("migrateCartState", () => {
  it("discards a legacy v1 cart that stored numeric product ids and float prices", () => {
    const legacyV1 = {
      items: [
        {
          id: 7,
          title: "Wireless Headphones",
          price: 19.99,
          image: "https://cdn.dummyjson.com/src/product-7.webp",
          quantity: 2,
        },
      ],
    };

    expect(migrateCartState(legacyV1, 0)).toEqual({ items: [] });
  });

  it("never coerces numeric legacy ids into variant ids", () => {
    const result = migrateCartState(
      { items: [{ id: 7, quantity: 1 }, { id: "8", quantity: 2 }] },
      0,
    );

    expect(result.items).toEqual([]);
    expect(
      result.items.some(
        (item) =>
          typeof (item as unknown as { id?: unknown }).id !== "undefined" ||
          typeof (item as unknown as { variantId?: unknown }).variantId === "number",
      ),
    ).toBe(false);
  });

  it("discards unreadable or non-object persisted state", () => {
    expect(migrateCartState(null, 0)).toEqual({ items: [] });
    expect(migrateCartState("cart", 0)).toEqual({ items: [] });
    expect(migrateCartState({ items: "not-an-array" }, 1)).toEqual({ items: [] });
  });
});
