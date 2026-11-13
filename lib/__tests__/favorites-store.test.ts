// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  migrateFavoriteState,
  useFavoritesStore,
  type FavoriteItem,
} from "../store/favorites-store";

const favoriteA: FavoriteItem = {
  productSlug: "dummy-1",
  variantId: "variant-a",
  title: "Product A",
  priceCents: 1999,
  image: "https://cdn.dummyjson.com/src/product-a.webp",
  description: "Product A description",
};

const favoriteB: FavoriteItem = {
  productSlug: "dummy-2",
  variantId: "variant-b",
  title: "Product B",
  priceCents: 2450,
  image: "https://cdn.dummyjson.com/src/product-b.webp",
  description: "Product B description",
};

beforeEach(() => {
  useFavoritesStore.setState({ items: [] });
});

describe("useFavoritesStore", () => {
  it("adds a favorite with its chosen variant", () => {
    useFavoritesStore.getState().addItem(favoriteA);

    expect(useFavoritesStore.getState().items).toEqual([favoriteA]);
  });

  it("does not duplicate a product slug that is already favorited", () => {
    const { addItem } = useFavoritesStore.getState();
    addItem(favoriteA);
    addItem(favoriteA);

    expect(useFavoritesStore.getState().items).toEqual([favoriteA]);
  });

  it("reports whether a product slug is favorited", () => {
    const { addItem, isFavorite } = useFavoritesStore.getState();
    expect(isFavorite("dummy-1")).toBe(false);

    addItem(favoriteA);
    expect(useFavoritesStore.getState().isFavorite("dummy-1")).toBe(true);
    expect(useFavoritesStore.getState().isFavorite("dummy-2")).toBe(false);
  });

  it("toggles a favorite on and off by product slug", () => {
    const { toggleFavorite } = useFavoritesStore.getState();

    toggleFavorite(favoriteA);
    expect(useFavoritesStore.getState().items).toEqual([favoriteA]);
    expect(useFavoritesStore.getState().isFavorite("dummy-1")).toBe(true);

    toggleFavorite(favoriteA);
    expect(useFavoritesStore.getState().items).toEqual([]);
    expect(useFavoritesStore.getState().isFavorite("dummy-1")).toBe(false);
  });

  it("removes only the targeted product slug", () => {
    const { addItem, removeItem } = useFavoritesStore.getState();
    addItem(favoriteA);
    addItem(favoriteB);
    removeItem("dummy-1");

    expect(useFavoritesStore.getState().items).toEqual([favoriteB]);
  });

  it("counts favorited products", () => {
    const { addItem, getTotalItems } = useFavoritesStore.getState();
    addItem(favoriteA);
    addItem(favoriteB);

    expect(useFavoritesStore.getState().getTotalItems()).toBe(2);
  });

  it("clears favorites", () => {
    const { addItem, clearFavorites } = useFavoritesStore.getState();
    addItem(favoriteA);
    addItem(favoriteB);
    clearFavorites();

    expect(useFavoritesStore.getState().items).toEqual([]);
    expect(useFavoritesStore.getState().getTotalItems()).toBe(0);
  });

  it("persists under favorites-storage at version 2 with a discarding migration", () => {
    const options = useFavoritesStore.persist.getOptions();

    expect(options.name).toBe("favorites-storage");
    expect(options.version).toBe(2);
    expect(options.migrate).toBe(migrateFavoriteState);
  });
});

describe("migrateFavoriteState", () => {
  it("discards a legacy v1 favorites list that stored numeric product ids and float prices", () => {
    const legacyV1 = {
      items: [
        {
          id: 7,
          title: "Wireless Headphones",
          price: 19.99,
          image: "https://cdn.dummyjson.com/src/product-7.webp",
          description: "Legacy favorite",
        },
      ],
    };

    expect(migrateFavoriteState(legacyV1, 0)).toEqual({ items: [] });
    expect(migrateFavoriteState(legacyV1, 1)).toEqual({ items: [] });
  });

  it("never coerces numeric legacy ids into product slugs", () => {
    const result = migrateFavoriteState(
      { items: [{ id: 7 }, { id: "8" }] },
      0,
    );

    expect(result.items).toEqual([]);
    expect(
      result.items.some(
        (item) =>
          typeof (item as unknown as { id?: unknown }).id !== "undefined" ||
          typeof (item as unknown as { productSlug?: unknown }).productSlug === "number",
      ),
    ).toBe(false);
  });

  it("discards unreadable or non-object persisted state", () => {
    expect(migrateFavoriteState(null, 0)).toEqual({ items: [] });
    expect(migrateFavoriteState("favorites", 0)).toEqual({ items: [] });
    expect(migrateFavoriteState({ items: "not-an-array" }, 1)).toEqual({ items: [] });
  });
});
