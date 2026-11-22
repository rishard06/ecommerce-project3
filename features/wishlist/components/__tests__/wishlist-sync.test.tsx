// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useFavoritesStore,
  type FavoriteItem,
} from "@/lib/store/favorites-store";

const sessionState = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: sessionState.session, isPending: false }),
}));

import { WishlistSync } from "../wishlist-sync";

const favoriteA: FavoriteItem = {
  productSlug: "dummy-1",
  variantId: "variant-a",
  title: "Product A",
  priceCents: 1999,
  image: "https://cdn.example.com/a.webp",
  description: "Product A description",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn();

const realActions = useFavoritesStore.getState();
const clearSpy = vi.fn(() => {
  realActions.clearFavorites();
});
const syncSpy = vi.fn(() => realActions.syncWithServer());

beforeEach(() => {
  useFavoritesStore.setState({
    items: [],
    serverSlugs: [],
    clearFavorites: clearSpy as never,
    syncWithServer: syncSpy as never,
  });
  clearSpy.mockClear();
  syncSpy.mockClear();
  sessionState.session = null;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function signInAs(userId: string) {
  sessionState.session = { user: { id: userId } };
}

describe("WishlistSync", () => {
  it("does nothing while signed out: guests stay local-only", () => {
    render(<WishlistSync />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it("syncs on fresh login without clearing anonymous local favorites", async () => {
    useFavoritesStore.setState({ items: [favoriteA] });
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonResponse({ items: ["dummy-1"] })
        : jsonResponse({ items: [] }),
    );

    const { rerender } = render(<WishlistSync />);
    signInAs("user-a");
    // Re-render with the new session so the effect key updates.
    rerender(<WishlistSync />);

    await waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1));
    expect(clearSpy).not.toHaveBeenCalled();
    // The anonymous favorite survives: it is pushed, never wiped.
    expect(useFavoritesStore.getState().items).toEqual([favoriteA]);
    await waitFor(() =>
      expect(useFavoritesStore.getState().serverSlugs).toEqual(["dummy-1"]),
    );
  });

  it("clears stale state and re-syncs on account switch without sign-out", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: ["dummy-b"] }));
    signInAs("user-a");
    useFavoritesStore.setState({ items: [favoriteA], serverSlugs: ["dummy-a"] });

    const { rerender } = render(<WishlistSync />);
    await waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1));
    clearSpy.mockClear();
    syncSpy.mockClear();

    signInAs("user-b");
    rerender(<WishlistSync />);

    await waitFor(() => expect(clearSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(useFavoritesStore.getState().serverSlugs).toEqual(["dummy-b"]),
    );
    expect(useFavoritesStore.getState().items).toEqual([]);
  });

  it("clears the previous account's hearts on sign-out", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: ["dummy-a"] }));
    signInAs("user-a");

    const { rerender } = render(<WishlistSync />);
    await waitFor(() => expect(syncSpy).toHaveBeenCalled());
    clearSpy.mockClear();

    sessionState.session = null;
    rerender(<WishlistSync />);

    await waitFor(() => expect(clearSpy).toHaveBeenCalledTimes(1));
    expect(useFavoritesStore.getState().serverSlugs).toEqual([]);
  });
});
