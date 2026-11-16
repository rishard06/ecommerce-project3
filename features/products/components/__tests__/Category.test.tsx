// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getProductsMock } = vi.hoisted(() => ({
  getProductsMock: vi.fn(),
}));

vi.mock("@/lib/products", () => ({
  getProducts: getProductsMock,
}));

import Category from "../Category";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Category", () => {
  it("renders live product counts from the catalog query", async () => {
    getProductsMock.mockResolvedValue({
      products: [],
      total: 12,
      skip: 0,
      take: 1,
    });

    render(await Category());

    expect(screen.getAllByText("12 products")).toHaveLength(4);
    expect(screen.queryByText(/10\+ products/)).toBeNull();
    expect(getProductsMock).toHaveBeenCalledWith("mobile-accessories", 0, 1);
    expect(getProductsMock).toHaveBeenCalledWith("mens-watches", 0, 1);
    expect(getProductsMock).toHaveBeenCalledWith("sports-accessories", 0, 1);
    expect(getProductsMock).toHaveBeenCalledWith("smartphones", 0, 1);
  });

  it("uses singular copy when the catalog has one product", async () => {
    getProductsMock.mockResolvedValue({
      products: [],
      total: 1,
      skip: 0,
      take: 1,
    });

    render(await Category());

    expect(screen.getAllByText("1 product")).toHaveLength(4);
  });

  it("omits counts when the catalog query fails", async () => {
    getProductsMock.mockRejectedValue(new Error("database unavailable"));

    render(await Category());

    expect(screen.queryByText(/products?\b/)).toBeNull();
    expect(
      screen.getByRole("link", { name: /shop mobile accessories/i }),
    ).toBeDefined();
  });
});
