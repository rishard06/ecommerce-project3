// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 10 guard: cursor links are emitted only when
 * `PRODUCTS_CURSOR_PAGINATION=1`. With the flag off every href is exactly the
 * old `skip` href, and legacy `skip` URLs keep working with the flag on.
 */

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getProducts: vi.fn(),
  getFeatureProducts: vi.fn(),
}));

vi.mock("@/lib/products", () => ({
  getCategories: mocks.getCategories,
  getProducts: mocks.getProducts,
  getFeatureProducts: mocks.getFeatureProducts,
}));

vi.mock("@/features/products/components/ProductCard", () => ({
  default: ({ slug, isPopular }: { slug: string; isPopular?: boolean }) => (
    <a href={`/products/${slug}`}>{isPopular ? `${slug} (popular)` : slug}</a>
  ),
}));

vi.mock("@/features/products/components/CategorySidebar", () => ({
  CategorySidebar: () => <aside data-testid="category-sidebar" />,
}));

import ProductsPage from "./page";
import { decodeCursor, encodeCursor } from "@/features/products/search";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const TOTAL = 42;
const PAGE = ["desk-21", "desk-22"];
const FEATURED = ["featured-1", "featured-2", "featured-3", "featured-4"];

function productSummary(slug: string) {
  return {
    slug,
    title: slug,
    description: `${slug} description`,
    priceCents: 1999,
    image: "",
    rating: 4,
    categorySlug: "office",
    categoryName: "Office",
    defaultVariantId: `variant-${slug}`,
    isPopular: false,
  };
}

async function renderPage(params: Record<string, string> = {}) {
  const ui = await ProductsPage({ searchParams: Promise.resolve(params) });
  return render(ui);
}

function hrefFor(name: RegExp): string {
  const link = screen.getByRole("link", { name });
  return link.getAttribute("href") ?? "";
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCategories.mockResolvedValue([{ slug: "office", name: "Office" }]);
  mocks.getProducts.mockResolvedValue({
    products: PAGE.map(productSummary),
    total: TOTAL,
    skip: 20,
    take: 20,
  });
  mocks.getFeatureProducts.mockResolvedValue(
    FEATURED.map((slug) => ({ ...productSummary(slug), isPopular: true })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("cursor pagination flag off (default)", () => {
  it("keeps emitting the legacy skip href", async () => {
    await renderPage({ skip: "20" });

    expect(hrefFor(/^next$/i)).toBe("/products?skip=40");
    expect(hrefFor(/^previous$/i)).toBe("/products?skip=0");
    expect(mocks.getProducts).toHaveBeenCalledWith(undefined, 20, 20, {
      q: undefined,
      sort: undefined,
      cursor: undefined,
    });
  });

  it("ignores a cursor param entirely", async () => {
    await renderPage({ skip: "20", cursor: encodeCursor("desk-20") });

    expect(hrefFor(/^next$/i)).toBe("/products?skip=40");
    expect(mocks.getProducts.mock.calls[0]?.[3]?.cursor).toBeUndefined();
  });
});

describe("cursor pagination flag on", () => {
  it("adds a cursor to the next href while keeping skip as fallback/display", async () => {
    vi.stubEnv("PRODUCTS_CURSOR_PAGINATION", "1");

    await renderPage({ skip: "20" });

    const href = hrefFor(/^next$/i);
    const query = new URL(href, "http://localhost").searchParams;
    expect(query.get("skip")).toBe("40");
    expect(decodeCursor(query.get("cursor") ?? undefined)).toBe("desk-22");
    expect(hrefFor(/^previous$/i)).toBe("/products?skip=0");
  });

  it("loads a cursor URL and keeps the page position from skip", async () => {
    vi.stubEnv("PRODUCTS_CURSOR_PAGINATION", "1");
    const cursor = encodeCursor("desk-20");

    await renderPage({ skip: "20", cursor });

    expect(mocks.getProducts).toHaveBeenCalledWith(undefined, 20, 20, {
      q: undefined,
      sort: undefined,
      cursor,
    });
    expect(screen.getByText(/page 2/i)).toBeDefined();
    expect(screen.getByText(/21–22 of 42/)).toBeDefined();
  });

  it("does not compose a cursor with the price-sorted path", async () => {
    vi.stubEnv("PRODUCTS_CURSOR_PAGINATION", "1");

    await renderPage({ skip: "20", sort: "price-asc" });

    const href = hrefFor(/^next$/i);
    expect(href).not.toContain("cursor=");
    expect(href).toBe("/products?sort=price-asc&skip=40");
    expect(mocks.getProducts.mock.calls[0]?.[3]?.cursor).toBeUndefined();
  });

  it("drops an invalid cursor back to skip paging, then self-heals", async () => {
    vi.stubEnv("PRODUCTS_CURSOR_PAGINATION", "1");

    await renderPage({ skip: "20", cursor: "20" });

    expect(mocks.getProducts.mock.calls[0]?.[3]?.cursor).toBeUndefined();

    const query = new URL(hrefFor(/^next$/i), "http://localhost").searchParams;
    expect(query.get("skip")).toBe("40");
    expect(decodeCursor(query.get("cursor") ?? undefined)).toBe("desk-22");
  });
});

describe("existing skip URLs", () => {
  it("still render page 2 with the category filter", async () => {
    vi.stubEnv("PRODUCTS_CURSOR_PAGINATION", "1");

    await renderPage({ category: "office", skip: "20" });

    expect(mocks.getProducts).toHaveBeenCalledWith("office", 20, 20, {
      q: undefined,
      sort: undefined,
      cursor: undefined,
    });
    expect(screen.getByRole("heading", { name: /office/i })).toBeDefined();
  });

  it("never emits NaN hrefs for a malformed skip", async () => {
    await renderPage({ skip: "abc" });

    expect(hrefFor(/^next$/i)).toBe("/products?skip=20");
    expect(screen.getByText(/page 1/i)).toBeDefined();
  });
});

describe("featured row", () => {
  const rowHeading = () => screen.queryByRole("heading", { name: /you may also like/i });

  it("shows top-rated picks above the grid on the unfiltered view", async () => {
    await renderPage();

    expect(rowHeading()).not.toBeNull();
    expect(mocks.getFeatureProducts).toHaveBeenCalledWith(4);
    // The card keeps the Popular badge flag and links to the detail page.
    expect(
      screen.getByRole("link", { name: "featured-1 (popular)" }).getAttribute("href"),
    ).toBe("/products/featured-1");
    // The full grid still renders below the row.
    expect(screen.getByRole("link", { name: "desk-21" })).toBeDefined();
  });

  it("hides the row for a search query and skips the featured query", async () => {
    await renderPage({ q: "desk" });

    expect(rowHeading()).toBeNull();
    expect(mocks.getFeatureProducts).not.toHaveBeenCalled();
  });

  it("hides the row for a category filter", async () => {
    await renderPage({ category: "office" });

    expect(rowHeading()).toBeNull();
    expect(mocks.getFeatureProducts).not.toHaveBeenCalled();
  });

  it("hides the row for a sort", async () => {
    await renderPage({ sort: "price-asc" });

    expect(rowHeading()).toBeNull();
    expect(mocks.getFeatureProducts).not.toHaveBeenCalled();
  });

  it("hides the row when a cursor paging hop is active", async () => {
    vi.stubEnv("PRODUCTS_CURSOR_PAGINATION", "1");

    await renderPage({ skip: "20", cursor: encodeCursor("desk-20") });

    expect(rowHeading()).toBeNull();
    expect(mocks.getFeatureProducts).not.toHaveBeenCalled();
  });

  it("stays visible when only paging (skip) changes", async () => {
    // Paging does not filter results, so page 2 is still the browse view.
    await renderPage({ skip: "20" });

    expect(rowHeading()).not.toBeNull();
    expect(mocks.getFeatureProducts).toHaveBeenCalledWith(4);
  });

  it("renders nothing when the catalog has no rated products", async () => {
    mocks.getFeatureProducts.mockResolvedValue([]);

    await renderPage();

    expect(rowHeading()).toBeNull();
  });
});
