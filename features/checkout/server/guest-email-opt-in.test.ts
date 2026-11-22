import { describe, expect, it, vi } from "vitest";
import {
  createPendingOrderInputSchema,
} from "./create-pending-order";
import { createOrderRecord } from "@/features/orders/server/order-repository";

/**
 * Ticket #14 RED: guest email opt-in capture.
 *
 * Contract under test:
 * - opt-in is explicit: `guestEmailOptIn: true` requires a valid
 *   `guestEmail`, otherwise validation fails;
 * - an unchecked box stores nothing (no address persisted);
 * - the write boundary persists the address only on guest orders and only
 *   with the flag set — signed-in orders never carry it, and an address
 *   without the flag is dropped (PII minimal).
 */

const SHIPPING = {
  fullName: "Jane Doe",
  line1: "123 Main Street",
  city: "Springfield",
  region: "IL",
  postalCode: "62701",
  country: "US",
};

const ITEMS = [{ variantId: "variant-1", quantity: 1 }];

describe("guest email opt-in validation", () => {
  it("accepts an explicit opt-in with a valid address", () => {
    const parsed = createPendingOrderInputSchema.parse({
      guestToken: "guest-token-1",
      idempotencyKey: "key-1",
      items: ITEMS,
      shipping: SHIPPING,
      guestEmail: "guest@example.com",
      guestEmailOptIn: true,
    });
    expect(parsed.guestEmail).toBe("guest@example.com");
    expect(parsed.guestEmailOptIn).toBe(true);
  });

  it("rejects opt-in without an address", () => {
    expect(() =>
      createPendingOrderInputSchema.parse({
        guestToken: "guest-token-1",
        idempotencyKey: "key-1",
        items: ITEMS,
        shipping: SHIPPING,
        guestEmailOptIn: true,
      }),
    ).toThrow(/email/i);
  });

  it("rejects opt-in with an invalid address", () => {
    expect(() =>
      createPendingOrderInputSchema.parse({
        guestToken: "guest-token-1",
        idempotencyKey: "key-1",
        items: ITEMS,
        shipping: SHIPPING,
        guestEmail: "not-an-email",
        guestEmailOptIn: true,
      }),
    ).toThrow(/email/i);
  });

  it("treats a missing checkbox as no opt-in", () => {
    const parsed = createPendingOrderInputSchema.parse({
      guestToken: "guest-token-1",
      idempotencyKey: "key-1",
      items: ITEMS,
      shipping: SHIPPING,
    });
    expect(parsed.guestEmailOptIn ?? false).toBe(false);
    expect(parsed.guestEmail).toBeUndefined();
  });
});

describe("guest email persistence boundary", () => {
  function fakeTx() {
    const create = vi.fn(async (args: { data: Record<string, unknown> }) => ({
      id: "order-1",
      ...args.data,
    }));
    return { tx: { order: { create } } as never, create };
  }

  const LINE = {
    variantId: "variant-1",
    productSlug: "slug",
    sku: "sku-1",
    title: "Snapshot product",
    unitPriceCents: 1999,
    quantity: 1,
    lineTotalCents: 1999,
  };

  function recordInput(overrides: Record<string, unknown> = {}) {
    return {
      guestToken: "guest-token-1",
      idempotencyKey: "key-1",
      currency: "USD",
      subtotalCents: 1999,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 1999,
      shipping: {
        fullName: "Jane Doe",
        line1: "123 Main Street",
        city: "Springfield",
        region: "IL",
        postalCode: "62701",
        country: "US",
      },
      items: [LINE],
      ...overrides,
    };
  }

  it("persists the address on a guest order with opt-in", async () => {
    const { tx, create } = fakeTx();
    await createOrderRecord(
      tx,
      recordInput({ guestEmail: "guest@example.com", guestEmailOptIn: true }),
    );
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestEmail: "guest@example.com",
        guestEmailOptIn: true,
      }),
    });
  });

  it("stores nothing when the box is unchecked", async () => {
    const { tx, create } = fakeTx();
    await createOrderRecord(tx, recordInput());
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestEmail: null,
        guestEmailOptIn: false,
      }),
    });
  });

  it("drops the address without the flag (never trust the browser)", async () => {
    const { tx, create } = fakeTx();
    await createOrderRecord(
      tx,
      recordInput({ guestEmail: "guest@example.com" }),
    );
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestEmail: null,
        guestEmailOptIn: false,
      }),
    });
  });

  it("never stores a guest address on a signed-in order", async () => {
    const { tx, create } = fakeTx();
    await createOrderRecord(
      tx,
      recordInput({
        userId: "user-1",
        guestToken: null,
        guestEmail: "guest@example.com",
        guestEmailOptIn: true,
      }),
    );
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestEmail: null,
        guestEmailOptIn: false,
      }),
    });
  });
});
