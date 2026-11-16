// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The real ProductCard, with only motion's rendering plumbing stubbed:
 * `motion.article` becomes a plain article that records its props, so tests can
 * assert the tactile feedback contract without driving real gestures.
 */
const mocks = vi.hoisted(() => ({ reducedMotion: false }));
const articleProps: Record<string, any>[] = [];

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  const ReactMod = await import("react");
  const StubArticle = ReactMod.forwardRef(function StubArticle(
    { children, ...props }: { children?: React.ReactNode } & Record<string, any>,
    ref: React.ForwardedRef<HTMLElement>,
  ) {
    articleProps.push(props);
    const {
      whileHover: _whileHover,
      whileTap: _whileTap,
      transition: _transition,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      variants: _variants,
      ...domProps
    } = props;

    return (
      <article ref={ref} {...domProps}>
        {children}
      </article>
    );
  });

  return {
    ...actual,
    useReducedMotion: () => mocks.reducedMotion,
    // `motion` is a proxy, so a spread would lose every element; wrap it and
    // swap only the article element.
    motion: new Proxy(actual.motion, {
      get(target, prop, receiver) {
        if (prop === "article") return StubArticle;
        return Reflect.get(target, prop, receiver);
      },
    }),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null, isPending: false }),
}));

import ProductCard from "../ProductCard";
import { spring } from "@/lib/motion";

const PRODUCT = {
  slug: "dummy-93",
  variantId: "variant-93",
  title: "Felted wool throw",
  priceCents: 6800,
  image: "/landing/deck-1.webp",
  description: "A quiet layer for slow evenings.",
};

function renderCard() {
  articleProps.length = 0;
  return render(<ProductCard {...PRODUCT} />);
}

function cardMotionProps(): Record<string, any> {
  const props = articleProps[articleProps.length - 1];
  if (!props) {
    throw new Error("ProductCard root is not a motion.article");
  }
  return props;
}

afterEach(cleanup);

beforeEach(() => {
  mocks.reducedMotion = false;
});

describe("ProductCard tactile feedback", () => {
  it("lifts on hover and compresses on press with the smooth spring", () => {
    const { container } = renderCard();
    const props = cardMotionProps();

    expect(props.whileHover).toEqual({ y: -2 });
    expect(props.whileTap).toEqual({ scale: 0.98 });
    expect(props.transition).toBe(spring.smooth);

    // CSS hover polish stays, but transform lift now lives in motion so the
    // two never fight over the transform property.
    expect(props.className).toContain("transition-shadow");
    expect(props.className).not.toContain("hover:-translate-y-0.5");

    const image = container.querySelector("img");
    expect(image?.className).toContain("group-hover:scale-[1.03]");
  });

  it("renders the card static under prefers-reduced-motion", () => {
    mocks.reducedMotion = true;
    const { container, getByRole } = renderCard();
    const props = cardMotionProps();

    // No motion props at all: the card cannot animate.
    expect(props.whileHover).toBeUndefined();
    expect(props.whileTap).toBeUndefined();
    expect(props.transition).toBeUndefined();

    // CSS transitions/transforms are gated too, so hover produces no movement.
    expect(props.className).not.toContain("transition-shadow");
    const image = container.querySelector("img");
    expect(image?.className).not.toContain("group-hover:scale-[1.03]");
    expect(image?.className).not.toContain("transition-transform");

    // The content still renders and stays interactive.
    const overlay = getByRole("link", { name: `View ${PRODUCT.title}` });
    expect(overlay.getAttribute("href")).toBe(`/products/${PRODUCT.slug}`);
    expect(
      getByRole("button", { name: `Add ${PRODUCT.title} to cart` }),
    ).toBeTruthy();
    expect(container.textContent).toContain(PRODUCT.title);
    expect(container.textContent).toContain("$68.00");
  });
});

describe("ProductCard prices", () => {
  it("renders the price with tabular figures", () => {
    const { getByText } = renderCard();

    // Tabular figures keep prices from jittering as digits change and align
    // price columns across cards.
    expect(getByText("$68.00").className).toContain("tabular-nums");
  });
});
