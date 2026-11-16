// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Retro Batch 3 I1: customer return request form. The server action is a
 * double; this suite pins the form fields, hidden viewer plumbing, and the
 * inline error/success states.
 */

const mocks = vi.hoisted(() => ({
  requestReturnAction: vi.fn(),
}));

vi.mock("@/features/returns/server/return-actions", () => ({
  requestReturnAction: mocks.requestReturnAction,
}));

import { ReturnRequestForm } from "./ReturnRequestForm";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requestReturnAction.mockResolvedValue({ success: true });
});

afterEach(cleanup);

describe("ReturnRequestForm", () => {
  it("renders a reason field, hidden order plumbing, and a submit button", () => {
    const { container } = render(
      <ReturnRequestForm orderId="order-1" guestToken="guest-token" />,
    );

    expect(screen.getByLabelText(/reason/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /request return/i }),
    ).toBeDefined();
    expect(
      container.querySelector('input[name="orderId"]')?.getAttribute("value"),
    ).toBe("order-1");
    expect(
      container.querySelector('input[name="guestToken"]')?.getAttribute("value"),
    ).toBe("guest-token");
  });

  it("surfaces an action failure inline", async () => {
    mocks.requestReturnAction.mockResolvedValue({
      success: false,
      error: "A return request already exists for this order.",
    });

    const { container } = render(<ReturnRequestForm orderId="order-1" />);
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "Too small" },
    });
    fireEvent.submit(container.querySelector("form")!);

    expect(
      await screen.findByRole("alert"),
    ).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain(
      "A return request already exists for this order.",
    );
  });

  it("confirms submission when the action succeeds", async () => {
    const { container } = render(<ReturnRequestForm orderId="order-1" />);
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "Too small" },
    });
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByText(/return request submitted/i)).toBeDefined();
  });
});
