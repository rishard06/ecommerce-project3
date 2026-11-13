import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

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

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/identity/server/guards";
import {
  getProductReviews,
  submitReview,
  type StoredReview,
} from "@/features/products/actions";

const reviewDelegate = prisma.review as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

const productDelegate = prisma.product as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const requireUserMock = vi.mocked(requireUser);

const PRODUCT_SLUG = "aurora-wireless-headphones";
const SESSION_USER = {
  id: "user-1",
  email: "user-1@example.com",
  role: "CUSTOMER" as const,
};

function storedReview(overrides: Partial<StoredReview> = {}): StoredReview {
  return {
    id: "review-1",
    productSlug: PRODUCT_SLUG,
    userId: SESSION_USER.id,
    rating: 5,
    comment: "Lovely finish",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(SESSION_USER);
  reviewDelegate.findFirst.mockResolvedValue(null);
  reviewDelegate.findMany.mockResolvedValue([]);
  reviewDelegate.create.mockResolvedValue(storedReview());
  productDelegate.findUnique.mockResolvedValue({ id: "product-1", reviews: [] });
  productDelegate.update.mockResolvedValue({});
});

describe("submitReview", () => {
  it("rejects guests before touching review storage", async () => {
    requireUserMock.mockRejectedValue(new Error("Unauthorized"));

    await expect(submitReview(PRODUCT_SLUG, 5, "Nice")).rejects.toThrow();

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(reviewDelegate.findFirst).not.toHaveBeenCalled();
    expect(reviewDelegate.create).not.toHaveBeenCalled();
  });

  it("rejects ratings outside 1..5", async () => {
    await expect(submitReview(PRODUCT_SLUG, 0, "x")).rejects.toThrow(/1 and 5/);
    await expect(submitReview(PRODUCT_SLUG, 6, "x")).rejects.toThrow(/1 and 5/);

    expect(reviewDelegate.create).not.toHaveBeenCalled();
  });

  it("rejects a second review by the session user", async () => {
    reviewDelegate.findFirst.mockResolvedValue(storedReview());

    await expect(
      submitReview(PRODUCT_SLUG, 5, "Lovely finish"),
    ).rejects.toThrow(/already reviewed/i);

    expect(reviewDelegate.findFirst).toHaveBeenCalledWith({
      where: { productSlug: PRODUCT_SLUG, userId: SESSION_USER.id },
    });
    expect(reviewDelegate.create).not.toHaveBeenCalled();
  });

  it("ignores a caller-supplied userId and owns the review by session", async () => {
    const forgedSubmit = submitReview as unknown as (
      productSlug: string,
      rating: number,
      comment: string,
      userId: string,
    ) => Promise<StoredReview>;

    await expect(
      forgedSubmit(PRODUCT_SLUG, 5, "Lovely finish", "victim-1"),
    ).resolves.toMatchObject({ userId: SESSION_USER.id });

    expect(reviewDelegate.findFirst).toHaveBeenCalledWith({
      where: { productSlug: PRODUCT_SLUG, userId: SESSION_USER.id },
    });
    expect(reviewDelegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productSlug: PRODUCT_SLUG,
        rating: 5,
        comment: "Lovely finish",
        userId: SESSION_USER.id,
      }),
    });
  });

  it("rejects an unknown product slug with a controlled error", async () => {
    productDelegate.findUnique.mockResolvedValue(null);

    await expect(submitReview("missing-product", 5, "Nice")).rejects.toThrow(
      /not found/i,
    );

    expect(reviewDelegate.create).not.toHaveBeenCalled();
  });

  it("persists a valid review and recomputes rating from seed + user reviews", async () => {
    productDelegate.findUnique.mockResolvedValue({
      id: "product-1",
      reviews: [{ rating: 5 }, { rating: 4 }],
    });
    reviewDelegate.findMany.mockResolvedValue([{ rating: 1 }]);
    reviewDelegate.create.mockResolvedValue(
      storedReview({ rating: 1, comment: "It is fine" }),
    );

    await expect(
      submitReview(PRODUCT_SLUG, 1, "It is fine"),
    ).resolves.toMatchObject({
      productSlug: PRODUCT_SLUG,
      rating: 1,
    });

    expect(reviewDelegate.findMany).toHaveBeenCalledWith({
      where: { productSlug: PRODUCT_SLUG },
      select: { rating: true },
    });
    expect(productDelegate.update).toHaveBeenCalledWith({
      where: { slug: PRODUCT_SLUG },
      data: { rating: 3.33 },
    });
  });
});

describe("getProductReviews", () => {
  it("returns persisted reviews newest-first and scopes to the slug", async () => {
    const newest = storedReview({
      id: "review-new",
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    const older = storedReview({
      id: "review-old",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    reviewDelegate.findMany.mockResolvedValue([newest, older]);

    await expect(getProductReviews(PRODUCT_SLUG)).resolves.toEqual([
      newest,
      older,
    ]);

    expect(reviewDelegate.findMany).toHaveBeenCalledWith({
      where: { productSlug: PRODUCT_SLUG },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  it("returns [] for an unknown slug instead of throwing", async () => {
    reviewDelegate.findMany.mockResolvedValue([]);

    await expect(getProductReviews("missing-product")).resolves.toEqual([]);
  });
});
