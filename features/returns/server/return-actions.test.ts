import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Retro Batch 3 I1: thin FormData wrapper around `requestReturn` for the
 * customer return form. Guards, validation, and error mapping are unit
 * tested here with doubles; the DB-backed `requestReturn` semantics stay in
 * the Task 14 suites.
 */

vi.mock("@/features/identity/server/guards", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/identity/server/guards")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

vi.mock("./actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./actions")>();
  return {
    ...actual,
    requestReturn: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getCurrentUser } from "@/features/identity/server/guards";
import { revalidatePath } from "next/cache";
import {
  DuplicateReturnError,
  OrderNotFoundError,
  requestReturn,
  ReturnNotEligibleError,
} from "./actions";
import { requestReturnAction } from "./return-actions";

const getCurrentUserMock = vi.mocked(getCurrentUser);
const requestReturnMock = vi.mocked(requestReturn);
const revalidatePathMock = vi.mocked(revalidatePath);

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1", email: "u@e.com", role: "CUSTOMER" });
  requestReturnMock.mockResolvedValue({
    id: "rr-1",
    orderId: "order-1",
    status: "PENDING",
    reason: "Too small",
    createdAt: new Date(),
  });
});

describe("requestReturnAction", () => {
  it("creates the request for the signed-in viewer and revalidates the order routes", async () => {
    const result = await requestReturnAction(
      form({ orderId: "order-1", reason: "Too small" }),
    );

    expect(result).toEqual({ success: true });
    expect(requestReturnMock).toHaveBeenCalledWith(
      "order-1",
      { userId: "user-1", guestToken: null },
      "Too small",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/orders/order-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/account/orders/order-1");
  });

  it("supports guest viewers through the order-link token", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await requestReturnAction(
      form({ orderId: "order-1", reason: "Too small", guestToken: "tok" }),
    );

    expect(result).toEqual({ success: true });
    expect(requestReturnMock).toHaveBeenCalledWith(
      "order-1",
      { userId: null, guestToken: "tok" },
      "Too small",
    );
  });

  it("rejects anonymous callers without a token", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await requestReturnAction(
      form({ orderId: "order-1", reason: "Too small" }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/sign in|order link/i);
    expect(requestReturnMock).not.toHaveBeenCalled();
  });

  it("returns a validation error for a missing order id", async () => {
    const result = await requestReturnAction(form({ reason: "Too small" }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/order id/i);
    expect(requestReturnMock).not.toHaveBeenCalled();
  });

  it("returns a validation error for a missing reason", async () => {
    const result = await requestReturnAction(form({ orderId: "order-1" }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/reason/i);
    expect(requestReturnMock).not.toHaveBeenCalled();
  });

  it("maps ineligibility to a form error without revalidating", async () => {
    requestReturnMock.mockRejectedValue(
      new ReturnNotEligibleError("Only delivered paid orders can be returned."),
    );

    const result = await requestReturnAction(
      form({ orderId: "order-1", reason: "Too small" }),
    );

    expect(result).toEqual({
      success: false,
      error: "Only delivered paid orders can be returned.",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("maps a duplicate request to a form error", async () => {
    requestReturnMock.mockRejectedValue(new DuplicateReturnError());

    const result = await requestReturnAction(
      form({ orderId: "order-1", reason: "Too small" }),
    );

    expect(result).toEqual({
      success: false,
      error: "A return request already exists for this order.",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("maps a foreign or missing order to a form error", async () => {
    requestReturnMock.mockRejectedValue(new OrderNotFoundError());

    const result = await requestReturnAction(
      form({ orderId: "order-1", reason: "Too small" }),
    );

    expect(result).toEqual({ success: false, error: "Order not found." });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
