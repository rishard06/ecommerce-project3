// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CartQuote } from "@/features/cart/types";
import { ReviewStep } from "../ReviewStep";

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

const ZERO_TOTAL_QUOTE: CartQuote = {
  items: [
    {
      variantId: "variant-1",
      productSlug: "demo-product",
      title: "Server-priced jacket",
      sku: "dummy-1",
      unitPriceCents: 2000,
      quantity: 1,
      lineTotalCents: 2000,
    },
  ],
  subtotalCents: 2000,
  discountCents: 2000,
  couponCode: "FREE100",
  shippingCents: 0,
  taxCents: 0,
  totalCents: 0,
  currency: "USD",
};

const PAID_QUOTE: CartQuote = { ...ZERO_TOTAL_QUOTE, totalCents: 1, taxCents: 1 };

function renderReviewStep(quote: CartQuote, onSubmit: () => void) {
  return render(
    <ReviewStep
      quote={quote}
      form={SHIPPING_FORM}
      savedAddressName={null}
      isQuoting={false}
      quoteError={null}
      couponCode="FREE100"
      appliedCouponCode="FREE100"
      isApplyingCoupon={false}
      couponError={null}
      isProcessing={false}
      error={null}
      onCouponCodeChange={() => {}}
      onApplyCoupon={() => {}}
      onBack={() => {}}
      onSubmit={onSubmit}
      isGuest={false}
      guestEmail=""
      guestEmailOptIn={false}
      onGuestEmailChange={() => {}}
      onGuestEmailOptInChange={() => {}}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("ReviewStep zero-total guard", () => {  it("disables submit and explains why when a coupon covers the full order", () => {
    const onSubmit = vi.fn();
    renderReviewStep(ZERO_TOTAL_QUOTE, onSubmit);

    const submit = screen.getByRole("button", { name: /continue to stripe/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/covers the full order/i);

    fireEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("leaves submit enabled for a non-zero total", () => {
    const onSubmit = vi.fn();
    renderReviewStep(PAID_QUOTE, onSubmit);

    const submit = screen.getByRole("button", { name: /continue to stripe/i });
    expect((submit as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("ReviewStep guest order-email opt-in", () => {
  function renderGuest(optIn: boolean, onOptInChange: (value: boolean) => void) {
    return render(
      <ReviewStep
        quote={PAID_QUOTE}
        form={SHIPPING_FORM}
        savedAddressName={null}
        isQuoting={false}
        quoteError={null}
        couponCode=""
        appliedCouponCode={null}
        isApplyingCoupon={false}
        couponError={null}
        isProcessing={false}
        error={null}
        onCouponCodeChange={() => {}}
        onApplyCoupon={() => {}}
        onBack={() => {}}
        onSubmit={() => {}}
        isGuest
        guestEmail=""
        guestEmailOptIn={optIn}
        onGuestEmailChange={() => {}}
        onGuestEmailOptInChange={onOptInChange}
      />,
    );
  }

  it("hides the opt-in for signed-in buyers", () => {
    renderReviewStep(PAID_QUOTE, () => {});
    expect(
      screen.queryByRole("checkbox", { name: /email me order updates/i }),
    ).toBeNull();
  });

  it("renders unchecked with no email field until the guest opts in", () => {
    renderGuest(false, () => {});
    const checkbox = screen.getByRole("checkbox", {
      name: /email me order updates/i,
    });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByLabelText(/email address/i)).toBeNull();
  });

  it("reveals the email field once checked", () => {
    const onOptInChange = vi.fn();
    renderGuest(false, onOptInChange);
    fireEvent.click(
      screen.getByRole("checkbox", { name: /email me order updates/i }),
    );
    expect(onOptInChange).toHaveBeenCalledWith(true);
  });

  it("shows the email field when opted in", () => {
    renderGuest(true, () => {});
    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
  });
});
