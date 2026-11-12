// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../actions", () => ({
  createOrderAction: vi.fn(),
}));

import { CheckoutForm } from "../components/CheckoutForm";
import { useCartStore } from "@/lib/store/cart-store";

describe("checkout flow", () => {
  beforeEach(() => {
    push.mockClear();
    useCartStore.setState({ items: [] });
  });

  it("shows an empty-cart guard instead of the wizard", () => {
    render(<CheckoutForm />);

    expect(screen.getByText(/cart is empty/i)).toBeTruthy();
  });
});
