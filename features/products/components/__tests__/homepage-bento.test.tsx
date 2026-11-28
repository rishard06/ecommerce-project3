// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Direction C homepage contract (Task 4).
 *
 * The homepage is one composition: hero grid + ticker, then a catalog bento
 * (t1 bestseller, t2 rooms, t3 real catalog stat, t4 promise, t5 quote,
 * t6 newsletter signup), then the craft band. These assertions pin the parts
 * a later section task could silently undo: one h1, landmarks, skip link,
 * DOM-order bento spans, live price/copy, and keyboard-visible focus.
 */

const fixtures = vi.hoisted(() => ({
  products: [
    {
      slug: "dummy-98",
      title: "Rolex Submariner Watch",
      description: "Automatic dive watch on a steel bracelet.",
      priceCents: 6400,
      image: "/landing/mug-tree.webp",
      rating: 5,
      categorySlug: "mens-watches",
      categoryName: "Watches",
      defaultVariantId: "variant-98",
      isPopular: true,
    },
  ],
  total: 12,
}));

vi.mock("@/lib/products", () => ({
  getFeatureProducts: async () => fixtures.products,
  // Category reads { total } from the paginated result shape.
  getProducts: async () => ({
    products: [],
    total: fixtures.total,
    skip: 0,
    take: 1,
  }),
}));

vi.mock("@paper-design/shaders-react", () => ({
  MeshGradient: () => <div data-testid="mesh" />,
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => false };
});

// The hero deck and word-level reveal are already covered by Hero tests.
vi.mock("@/components/animations/BlurText", () => ({
  default: ({ text }: { text?: string }) => (
    <h1 className="display font-display">{text}</h1>
  ),
}));

vi.mock("@/components/animations/Stack", () => ({
  default: ({ cards }: { cards?: ReactNode[] }) => (
    <div data-testid="hero-deck">{cards}</div>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null, isPending: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// NavBar internals are outside this contract; keep only the nav landmark.
vi.mock("@/components/layout/Logo", () => ({
  default: () => <span data-testid="logo" />,
}));
vi.mock("@/components/layout/MobileMenu", () => ({ default: () => null }));
vi.mock("@/components/layout/Search", () => ({ default: () => null }));
vi.mock("@/components/layout/UserAction", () => ({ default: () => null }));
vi.mock("@/features/cart/components/CartAction", () => ({
  default: () => null,
}));
vi.mock("@/features/cart/components/CartBadge", () => ({
  CartBadge: () => null,
}));

import ShopLayout from "@/app/(shop)/layout";
import Home from "@/app/(shop)/page";

const ROOT = process.cwd();
const read = (...parts: string[]) =>
  readFileSync(path.join(ROOT, ...parts), "utf8");
const CSS = read("app", "globals.css");
const PAGE_SRC = read("app", "(shop)", "page.tsx");
const TILE_SOURCES = [
  read("features", "products", "components", "FeatureProducts.tsx"),
  read("features", "products", "components", "ProductCard.tsx"),
  read("features", "products", "components", "Category.tsx"),
  read("components", "marketing", "Features.tsx"),
  read("components", "marketing", "Testimonies.tsx"),
  read("components", "marketing", "DropAlert.tsx"),
] as const;

afterEach(cleanup);

/** Strip comments before scanning source for forbidden patterns. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

async function renderHomepage() {
  const page = await Home();
  return render(<ShopLayout>{page}</ShopLayout>);
}

describe("homepage landmarks", () => {
  it("renders exactly one h1 and the page landmarks", async () => {
    const { container } = await renderHomepage();

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Things worth keeping.",
    );
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("offers a skip link to a focusable main target and a focus-visible ring", async () => {
    const { container } = await renderHomepage();

    const skip = screen.getByRole("link", { name: /skip to content/i });
    expect(skip.getAttribute("href")).toBe("#content");
    expect(skip.className).toContain("focus-visible:ring");

    const main = container.querySelector("#content");
    expect(main?.tagName).toBe("MAIN");
    expect(main?.getAttribute("tabindex")).toBe("-1");

    expect(CSS).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px\s+solid/);
  });
});

describe("hero grid and ticker", () => {
  it("mounts the hero grid with the ticker directly after it", async () => {
    const { container } = await renderHomepage();

    const header = container.querySelector("header");
    const grid = header?.querySelector(".hero-grid");
    expect(grid).not.toBeNull();

    const ticker = screen.getByRole("region", { name: "Store highlights" });
    expect(
      grid!.compareDocumentPosition(ticker) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const text = ticker.textContent ?? "";
    for (const item of [
      "Small batch",
      "Repairable",
      "Carbon-neutral",
      "Made in Porto",
      "No seasonal churn",
    ]) {
      expect(text).toContain(item);
    }
  });

  it("keeps the ticker pause control 44px, pointer, and keyboard operable", async () => {
    await renderHomepage();

    const pause = screen.getByRole("button", { name: "Pause highlights" });
    expect(pause.tagName).toBe("BUTTON");
    expect(pause.className).toContain("h-11");
    expect(pause.className).toContain("min-w-11");
    expect(pause.className).toContain("cursor-pointer");

    fireEvent.click(pause);
    expect(
      screen.getByRole("button", { name: "Play highlights" }),
    ).toBeTruthy();
  });
});

describe("catalog bento", () => {
  it("renders t1-t6 in DOM order as articles, each with a heading", async () => {
    const { container } = await renderHomepage();
    const bento = container.querySelector(".bento");

    expect(bento).not.toBeNull();
    const tiles = ["t1", "t2", "t3", "t4", "t5", "t6"].map((tile) =>
      bento!.querySelector<HTMLElement>(`[data-tile="${tile}"]`),
    );

    for (const [index, tile] of tiles.entries()) {
      expect(tile, `t${index + 1} should render`).not.toBeNull();
      expect(tile!.tagName).toBe("ARTICLE");
      expect(
        tile!.querySelector("h1, h2, h3"),
        `t${index + 1} should have a heading`,
      ).not.toBeNull();
    }

    // DOM order must remain the visual order (no dense placement).
    const order = tiles.map((tile) => tile!.getAttribute("data-tile"));
    expect(order).toEqual(["t1", "t2", "t3", "t4", "t5", "t6"]);
  });

  it("gives t1 the 2x2 span and keeps the live product title, price, and description", async () => {
    const { container } = await renderHomepage();
    const t1 = container.querySelector<HTMLElement>('[data-tile="t1"]');
    const product = fixtures.products[0];

    expect(t1).not.toBeNull();
    expect(t1!.className).toContain("col-span-2");
    expect(t1!.className).toContain("row-span-2");
    expect(t1!.className).toContain("max-[540px]:col-span-1");
    expect(t1!.className).toContain("max-[540px]:row-span-1");

    expect(
      within(t1!).getByRole("heading", { name: product.title }),
    ).toBeTruthy();
    expect(within(t1!).getByText("$64.00")).toBeTruthy();
    expect(t1!.textContent).toContain(product.description);
    expect(
      within(t1!).getByRole("link", { name: `View ${product.title}` }),
    ).toHaveAttribute("href", `/products/${product.slug}`);

    const add = within(t1!).getByRole("button", {
      name: `Add ${product.title} to cart`,
    });
    const favorite = within(t1!).getByRole("button", {
      name: `Save ${product.title} to favorites`,
    });
    expect(add.className).toContain("size-11");
    expect(favorite.className).toContain("size-11");
    expect(favorite.className).toContain("cursor-pointer");
  });

  it("reserves the t1 art with an aspect ratio instead of shifting on load", async () => {
    const { container } = await renderHomepage();
    const t1 = container.querySelector<HTMLElement>('[data-tile="t1"]');
    const art = t1?.querySelector<HTMLElement>("[data-product-art]");

    expect(art).not.toBeNull();
    expect(art!.className).toMatch(/aspect-/);
    expect(art!.className).toContain("overflow-clip");
    expect(art!.querySelector("img")).not.toBeNull();
  });

  it("renders live category counts in t2 and keeps 44px links", async () => {
    const { container } = await renderHomepage();
    const t2 = container.querySelector<HTMLElement>('[data-tile="t2"]');

    expect(t2).not.toBeNull();
    expect(
      within(t2!).getByRole("heading", { name: /shop by category/i }),
    ).toBeTruthy();

    const mobile = within(t2!).getByRole("link", {
      name: /shop mobile accessories/i,
    });
    expect(mobile.getAttribute("href")).toBe(
      "/products?category=mobile-accessories&skip=0",
    );
    expect(mobile.className).toContain("min-h-11");
    expect(mobile.className).toContain("cursor-pointer");
    expect(mobile.className).toContain("focus-visible:ring");

    // The visible count is compact; the accessible text stays "12 products".
    expect(within(t2!).getAllByText("12 products")).toHaveLength(4);
  });

  it("renders the t3 catalog stat from the real total, not mockup filler", async () => {
    const { container } = await renderHomepage();
    const t3 = container.querySelector<HTMLElement>('[data-tile="t3"]');

    expect(t3).not.toBeNull();
    expect(t3!.textContent).toContain(String(fixtures.total));
    expect(t3!.textContent).not.toContain("materials rejected");
    expect(t3!.textContent).not.toContain("ten-year test");
  });

  it("keeps the existing promise, quote, and newsletter copy", async () => {
    const { container } = await renderHomepage();

    expect(
      screen.getByRole("heading", { name: /why shop with us/i }),
    ).toBeTruthy();
    expect(
      screen.getByText(/made with materials chosen to last/i),
    ).toBeTruthy();

    expect(
      screen.getByRole("heading", { name: /what customers say/i }),
    ).toBeTruthy();
    expect(
      screen.getByText(/the rolex submariner watch keeps near-perfect time/i),
    ).toBeTruthy();

    const t6 = container.querySelector<HTMLElement>('[data-tile="t6"]');
    expect(t6).not.toBeNull();
    expect(
      within(t6!).getByRole("heading", {
        name: /occasional notes on new arrivals and restocks/i,
      }),
    ).toBeTruthy();
    const email = within(t6!).getByLabelText(/email address/i);
    expect(email.getAttribute("type")).toBe("email");
    expect(
      within(t6!).getByRole("button", { name: /subscribe to newsletter/i }),
    ).toBeTruthy();

    // A submit must not claim a subscription; it routes to registration.
    fireEvent.change(email, { target: { value: "reader@example.com" } });
    fireEvent.submit(email.closest("form") as HTMLFormElement);

    const status = within(t6!).getByRole("status");
    expect(status.textContent).toMatch(/newsletter signup is not connected yet/i);
    expect(
      within(status).getByRole("link", { name: /create account/i }),
    ).toHaveAttribute("href", "/register");
  });

  it("never opts an interactive tile into dense grid flow", () => {
    for (const source of [CSS, PAGE_SRC, ...TILE_SOURCES]) {
      const code = stripComments(source);
      expect(code).not.toMatch(/grid-auto-flow\s*:\s*dense/);
      expect(code).not.toContain("grid-flow-dense");
    }
  });
});

describe("craft band", () => {
  it("keeps the editorial heading, image, and collection link", async () => {
    await renderHomepage();

    expect(
      screen.getByRole("heading", { name: /made to be kept/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: /leafy green plant in a dark bowl planter/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /browse the collection/i }),
    ).toHaveAttribute("href", "/products");
  });
});
