import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { submitReview } from "@/features/products/actions";

const reviewDelegate = prisma.review as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

describe("submitReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewDelegate.findFirst.mockResolvedValue(null);
    reviewDelegate.create.mockResolvedValue({
      id: "review-1",
      productId: 1,
      userId: "user-1",
      rating: 5,
      comment: "Lovely finish",
      createdAt: new Date(),
    });
  });

  it("rejects rating 6", async () => {
    await expect(submitReview(1, 6, "x", "user-1")).rejects.toThrow();
    expect(reviewDelegate.create).not.toHaveBeenCalled();
  });

  it("rejects guests", async () => {
    await expect(submitReview(1, 5, "Nice", undefined)).rejects.toThrow(/sign in/i);
    await expect(submitReview(1, 5, "Nice", "guest")).rejects.toThrow(/sign in/i);
    expect(reviewDelegate.create).not.toHaveBeenCalled();
  });

  it("rejects a second review by the same user", async () => {
    reviewDelegate.findFirst.mockResolvedValue({
      id: "review-0",
      productId: 1,
      userId: "user-1",
      rating: 4,
      comment: "Earlier",
      createdAt: new Date(),
    });
    await expect(submitReview(1, 5, "Lovely finish", "user-1")).rejects.toThrow(/already reviewed/i);
    expect(reviewDelegate.create).not.toHaveBeenCalled();
  });

  it("accepts rating 5", async () => {
    await expect(submitReview(1, 5, "Lovely finish", "user-1")).resolves.toMatchObject({
      rating: 5,
      productId: 1,
    });
    expect(reviewDelegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 1,
        rating: 5,
        comment: "Lovely finish",
        userId: "user-1",
      }),
    });
  });
});
