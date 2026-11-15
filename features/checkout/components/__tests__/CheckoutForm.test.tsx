// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  quoteCheckoutAction: vi.fn(),
  startCheckoutAction: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  listAddresses: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/checkout/actions", () => ({
  quoteCheckoutAction: mocks.quoteCheckoutAction,
  startCheckoutAction: mocks.startCheckoutAction,
}));

vi.mock("@/features/account/address-actions", () => ({
  listAddresses: mocks.listAddresses,
}));

import { useCartStore } from "@/lib/store/cart-store";
import type { CartQuote } from "@/features/cart/types";
import { SHIPPING_STORAGE_KEY } from "../../preamble";
import { CheckoutForm } from "../CheckoutForm";

const QUOTE: CartQuote = {
  items: [
    {
      variantId: "variant-1",
      productSlug: "demo-product",
      title: "Server-priced jacket",
      sku: "dummy-1",
      unitPriceCents: 2100,
      quantity: 2,
      lineTotalCents: 4200,
    },
  ],
  subtotalCents: 4200,
  discountCents: 0,
  couponCode: null,
  shippingCents: 0,
  taxCents: 63,
  totalCents: 4263,
  currency: "USD",
};

const DISCOUNTED_QUOTE: CartQuote = {
  ...QUOTE,
  discountCents: 420,
  couponCode: "SAVE10",
  taxCents: 57,
  totalCents: 3837,
};

const SHIPPING_FORM = {
  firstName: "Jane",
  lastName: "Doe",
  address: "123 Main Street",
  line2: "",
  city: "Springfield",
  region: "IL",
  postalCode: "62701",
  country: "United States",
};

beforeEach(() => {
  mocks.quoteCheckoutAction.mockReset();
  mocks.startCheckoutAction.mockReset();
  mocks.push.mockReset();
  mocks.replace.mockReset();
  mocks.listAddresses.mockReset();
  mocks.listAddresses.mockResolvedValue([]);

  useCartStore.setState({
    items: [
      {
        variantId: "variant-1",
        productSlug: "demo-product",
        title: "Server-priced jacket",
        priceCents: 2100,
        image: "",
        quantity: 2,
      },
    ],
  });

  window.sessionStorage.setItem(
    SHIPPING_STORAGE_KEY,
    JSON.stringify(SHIPPING_FORM),
  );
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  useCartStore.setState({ items: [] });
});

describe("CheckoutForm coupon input", () => {
  it("shows the server error and preserves the server total when a coupon is rejected", async () => {
    mocks.quoteCheckoutAction
      .mockResolvedValueOnce({ success: true, quote: QUOTE })
      .mockResolvedValueOnce({
        success: false,
        error: "Coupon code is not valid.",
      });

    render(createElement(CheckoutForm, { step: "review" }));

    await screen.findByText("$42.63");

    fireEvent.change(screen.getByLabelText("Coupon code"), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Coupon code is not valid.");

    // Totals must stay at the last server quote, never a client-side guess.
    expect(screen.getByText("$42.63").textContent).toBe("$42.63");
    expect(screen.queryByText(/\$3[0-9]\./)).toBeNull();
    expect(mocks.quoteCheckoutAction).toHaveBeenLastCalledWith(
      [{ variantId: "variant-1", quantity: 2 }],
      "nope",
    );
  });

  it("renders the discount and total from the server quote when a coupon applies", async () => {
    mocks.quoteCheckoutAction
      .mockResolvedValueOnce({ success: true, quote: QUOTE })
      .mockResolvedValueOnce({ success: true, quote: DISCOUNTED_QUOTE });

    render(createElement(CheckoutForm, { step: "review" }));

    await screen.findByText("$42.63");

    fireEvent.change(screen.getByLabelText("Coupon code"), {
      target: { value: "save10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await screen.findByText("$38.37");

    expect(screen.getByText("-$4.20").textContent).toBe("-$4.20");
    expect(screen.getByRole("status").textContent).toContain(
      "Coupon SAVE10 applied.",
    );
    expect(
      (screen.getByLabelText("Coupon code") as HTMLInputElement).value,
    ).toBe("SAVE10");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
