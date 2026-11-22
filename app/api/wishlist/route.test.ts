import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/identity/server/guards", () => {
  class MockUnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }

  return {
    requireUser: vi.fn(),
    UnauthorizedError: MockUnauthorizedError,
  };
});

vi.mock("@/features/wishlist/server/actions", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/wishlist/server/actions")>();
  return {
    ...actual,
    getWishlist: vi.fn(),
    setWishlisted: vi.fn(),
    getWishlistCards: vi.fn(),
  };
});

const { requireUser, UnauthorizedError } = await import(
  "@/features/identity/server/guards"
);
const { getWishlist, getWishlistCards, setWishlisted } = await import(
  "@/features/wishlist/server/actions"
);
const { GET, POST } = await import("./route");
const { clearRateLimitStore } = await import("@/lib/rate-limit");

const requireUserMock = vi.mocked(requireUser);
const getWishlistMock = vi.mocked(getWishlist);
const getWishlistCardsMock = vi.mocked(getWishlistCards);
const setWishlistedMock = vi.mocked(setWishlisted);

const USER = { id: "wishlist-user-a", email: "a@example.com", role: "CUSTOMER" as const };

function postRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearRateLimitStore();
  requireUserMock.mockResolvedValue(USER);
  getWishlistMock.mockResolvedValue(["dummy-1"]);
  getWishlistCardsMock.mockResolvedValue([]);
  setWishlistedMock.mockImplementation(async () => ["dummy-1", "dummy-2"]);
});

describe("GET /api/wishlist", () => {
  it("returns 401 with an error body when anonymous", async () => {
    requireUserMock.mockRejectedValueOnce(new UnauthorizedError());

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(getWishlistMock).not.toHaveBeenCalled();
  });

  it("returns the session user's slugs (ownership comes from the session)", async () => {
    getWishlistMock.mockResolvedValueOnce(["dummy-3"]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: ["dummy-3"], cards: [] });
    expect(getWishlistMock).toHaveBeenCalledWith(USER.id);
  });

  it("hydrates the user's own slugs as cards (title/price/image for other-device hearts)", async () => {
    const cards = [
      {
        productSlug: "dummy-9",
        title: "Other-device lamp",
        priceCents: 3499,
        image: "https://cdn.example.com/dummy-9.webp",
        variantId: "variant-9",
        description: "Saved on another device.",
      },
    ];
    getWishlistMock.mockResolvedValueOnce(["dummy-9"]);
    getWishlistCardsMock.mockResolvedValueOnce(cards);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: ["dummy-9"], cards });
    expect(getWishlistCardsMock).toHaveBeenCalledWith(USER.id);
  });
});

describe("POST /api/wishlist", () => {
  it("returns 401 with an error body when anonymous", async () => {
    requireUserMock.mockRejectedValueOnce(new UnauthorizedError());

    const res = await POST(postRequest({ slug: "dummy-1" }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(setWishlistedMock).not.toHaveBeenCalled();
  });

  it("adds the slug by default and returns the updated list", async () => {
    const res = await POST(postRequest({ slug: "dummy-2" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: ["dummy-1", "dummy-2"] });
    expect(setWishlistedMock).toHaveBeenCalledWith(USER.id, "dummy-2", true);
  });

  it("honours wished: false for unfavorite propagation", async () => {
    setWishlistedMock.mockResolvedValueOnce(["dummy-1"]);

    const res = await POST(postRequest({ slug: "dummy-2", wished: false }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: ["dummy-1"] });
    expect(setWishlistedMock).toHaveBeenCalledWith(USER.id, "dummy-2", false);
  });

  it("returns 400 for missing, empty, overlong, or non-string slugs", async () => {
    for (const body of [
      {},
      { slug: "" },
      { slug: "x".repeat(129) },
      { slug: 42 },
      "not-json{{{",
    ]) {
      setWishlistedMock.mockClear();

      const res = await POST(postRequest(body));

      expect(res.status).toBe(400);
      expect(setWishlistedMock).not.toHaveBeenCalled();
    }
  });

  it("rate-limits abusive POST bursts with 429 + Retry-After (like orders)", async () => {
    for (let i = 0; i < 100; i++) {
      const res = await POST(postRequest({ slug: `dummy-${i}` }));
      expect(res.status).toBe(200);
    }

    const limited = await POST(postRequest({ slug: "dummy-overflow" }));

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    expect(await limited.json()).toEqual({
      error: "Too many requests",
      code: "RATE_LIMITED",
    });
    expect(setWishlistedMock).toHaveBeenCalledTimes(100);
  });
});
