// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFavoritesStore } from "@/lib/store/favorites-store";

vi.mock("motion/react", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => tag,
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null, isPending: false }),
}));

import FavoritesPage from "@/app/(shop)/favorites/page";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  useFavoritesStore.setState({ items: [], serverSlugs: [] });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FavoritesPage", () => {
  it("renders other-device slugs as cards with title/price/image", async () => {
    useFavoritesStore.setState({ items: [], serverSlugs: ["dummy-9"] });
    fetchMock.mockImplementation(async () =>
      jsonResponse({
        items: ["dummy-9"],
        cards: [
          {
            productSlug: "dummy-9",
            title: "Other-device lamp",
            priceCents: 3499,
            image: "https://cdn.example.com/dummy-9.webp",
            variantId: "variant-9",
            description: "Saved on another device.",
          },
        ],
      }),
    );

    const { container } = render(<FavoritesPage />);

    await waitFor(() =>
      expect(container.textContent).toContain("Other-device lamp"),
    );
    // Card shows the hydrated price and image, not an empty state.
    expect(container.textContent).toContain("$34.99");
    expect(
      container.querySelector('img[alt="Other-device lamp"]')?.getAttribute("src"),
    ).toContain("dummy-9");
    expect(container.textContent).toContain("1 item saved for later");
    expect(container.textContent).not.toContain("Nothing saved yet");
  });

  it("keeps the empty state when neither device has favorites", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [], cards: [] }));

    const { container } = render(<FavoritesPage />);

    await waitFor(() =>
      expect(container.textContent).toContain("Nothing saved yet"),
    );
  });
});
