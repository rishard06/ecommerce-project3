// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  useFavoritesStore.setState({ items: [], serverSlugs: [] });
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function flushPushes(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("syncWithServer", () => {
  it("pulls the server list into serverSlugs without touching local items", async () => {
    useFavoritesStore.getState().addItem(favoriteA);
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: ["dummy-9"] }));

    await useFavoritesStore.getState().syncWithServer();

    expect(fetchMock).toHaveBeenCalledWith("/api/wishlist");
    expect(useFavoritesStore.getState().serverSlugs).toEqual(["dummy-9"]);
    // Local cache is preserved; the server list lives alongside it.
    expect(useFavoritesStore.getState().items).toEqual([favoriteA]);
  });

  it("pushes local-only slugs so a second device sees them", async () => {
    useFavoritesStore.getState().addItem(favoriteA);
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: ["dummy-1"] }),
    );

    await useFavoritesStore.getState().syncWithServer();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/wishlist",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slug: "dummy-1", wished: true }),
      }),
    );
    expect(useFavoritesStore.getState().serverSlugs).toEqual(["dummy-1"]);
  });

  it("keeps the local cache when anonymous (401): guests stay local-only", async () => {
    useFavoritesStore.getState().addItem(favoriteA);
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401));

    await useFavoritesStore.getState().syncWithServer();

    expect(useFavoritesStore.getState().items).toEqual([favoriteA]);
    expect(useFavoritesStore.getState().serverSlugs).toEqual([]);
  });

  it("keeps previous state when the network fails", async () => {
    useFavoritesStore.setState({ items: [favoriteA], serverSlugs: ["dummy-9"] });
    fetchMock.mockClear();
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));

    await useFavoritesStore.getState().syncWithServer();

    expect(useFavoritesStore.getState().items).toEqual([favoriteA]);
    expect(useFavoritesStore.getState().serverSlugs).toEqual(["dummy-9"]);
  });
});

describe("cross-device heart state", () => {
  it("treats server-only slugs as favorited without fabricating items", async () => {
    useFavoritesStore.setState({ items: [], serverSlugs: ["dummy-9"] });

    expect(useFavoritesStore.getState().isFavorite("dummy-9")).toBe(true);
    expect(useFavoritesStore.getState().isFavorite("dummy-1")).toBe(false);
    expect(useFavoritesStore.getState().getTotalItems()).toBe(1);
  });

  it("counts the union of local items and server slugs once", () => {
    useFavoritesStore.setState({
      items: [favoriteA, favoriteB],
      serverSlugs: ["dummy-1", "dummy-9"],
    });

    expect(useFavoritesStore.getState().getTotalItems()).toBe(3);
  });
});

describe("mutation propagation", () => {
  it("pushes wished: true when a favorite is added", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: ["dummy-1"] }));

    useFavoritesStore.getState().addItem(favoriteA);
    await flushPushes();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wishlist",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slug: "dummy-1", wished: true }),
      }),
    );
  });

  it("pushes wished: false when a favorite is removed", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    useFavoritesStore.setState({ items: [favoriteA], serverSlugs: [] });
    fetchMock.mockClear();

    useFavoritesStore.getState().removeItem("dummy-1");
    await flushPushes();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wishlist",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slug: "dummy-1", wished: false }),
      }),
    );
    expect(useFavoritesStore.getState().items).toEqual([]);
  });

  it("swallows push failures: the local mutation still applies", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));

    useFavoritesStore.getState().addItem(favoriteA);
    await flushPushes();

    expect(useFavoritesStore.getState().items).toEqual([favoriteA]);
  });
});

describe("logout reset", () => {
  it("clears items and server slugs together", () => {
    useFavoritesStore.setState({ items: [favoriteA], serverSlugs: ["dummy-9"] });

    useFavoritesStore.getState().clearFavorites();

    expect(useFavoritesStore.getState().items).toEqual([]);
    expect(useFavoritesStore.getState().serverSlugs).toEqual([]);
    expect(useFavoritesStore.getState().getTotalItems()).toBe(0);
  });
});

describe("persistence boundary", () => {
  it("never persists server slugs: localStorage stays the offline cache", () => {
    const options = useFavoritesStore.persist.getOptions();

    expect(options.partialize?.({ items: [favoriteA], serverSlugs: ["dummy-9"] } as never)).toEqual({
      items: [favoriteA],
    });
  });
});
