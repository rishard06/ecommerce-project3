// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => false };
});

import { CartItem } from "../CartItem";

const ITEM = {
  variantId: "variant-93",
  productSlug: "dummy-93",
  title: "Felted wool throw",
  priceCents: 6800,
  image: "/landing/deck-1.webp",
  quantity: 2,
};

afterEach(cleanup);

describe("CartItem prices", () => {
  it("renders both line prices with tabular figures", () => {
    const { getByText } = render(
      <CartItem item={ITEM} onRemove={() => {}} />,
    );

    // Unit price ("2 × $68.00") and line total ("$136.00") both use tabular
    // figures so quantity changes never shift the price column.
    expect(getByText("$68.00").className).toContain("tabular-nums");
    expect(getByText("$136.00").className).toContain("tabular-nums");
  });
});
