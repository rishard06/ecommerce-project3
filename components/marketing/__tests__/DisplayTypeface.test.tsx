// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";

const motionMocks = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => motionMocks.reducedMotion };
});

vi.mock("@/components/animations/Stack", () => ({
  default: () => <div data-testid="hero-deck" />,
}));

// BlurText mock forwards className so the H1 typeface class is observable.
vi.mock("@/components/animations/BlurText", () => ({
  default: ({ text, className }: { text?: string; className?: string }) => (
    <h1 className={className}>{text}</h1>
  ),
}));

vi.mock("@/lib/products", () => ({
  getFeatureProducts: async () => [],
  // Category reads { total } from the paginated result shape.
  getProducts: async () => ({ products: [], total: 12, skip: 0, take: 1 }),
}));

import Hero from "../Hero";
import Category from "@/features/products/components/Category";
import FeatureProducts from "@/features/products/components/FeatureProducts";
import CraftBand from "../CraftBand";
import Features from "../Features";
import Testimonies from "../Testimonies";

afterEach(cleanup);

describe("display typeface", () => {
  it("applies the display class to the Hero H1", () => {
    const { getByRole } = render(<Hero />);
    const heading = getByRole("heading", { name: /things worth keeping/i });

    expect(heading.tagName).toBe("H1");
    expect(heading.className).toContain("font-display");
  });

  it("applies the display class to every landing section title", async () => {
    // Category is an async Server Component after the Batch-1 live-counts
    // change, so await it before rendering.
    const { getByRole: getCategory } = render(await Category());
    expect(
      getCategory("heading", { name: /shop by category/i }).className,
    ).toContain("font-display");
    cleanup();

    const { getByRole: getFeatured } = render(await FeatureProducts());
    expect(
      getFeatured("heading", { name: /featured products/i }).className,
    ).toContain("font-display");
    cleanup();

    const { getByRole: getCraft } = render(<CraftBand />);
    expect(
      getCraft("heading", { name: /made to be kept/i }).className,
    ).toContain("font-display");
    cleanup();

    const { getByRole: getFeatures } = render(<Features />);
    expect(
      getFeatures("heading", { name: /why shop with us/i }).className,
    ).toContain("font-display");
    cleanup();

    const { getByRole: getTestimonies } = render(<Testimonies />);
    expect(
      getTestimonies("heading", { name: /what customers say/i }).className,
    ).toContain("font-display");
  });

  it("leaves body copy on the body font (no display creep)", () => {
    const { container } = render(<Hero />);
    const subcopy = container.querySelector("p");

    expect(subcopy).not.toBeNull();
    expect(subcopy!.className).not.toContain("font-display");
  });
});
