// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import React, { type ForwardedRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFavoritesStore } from "@/lib/store/favorites-store";

/**
 * ProductCard rendered-output snapshot.
 *
 * The real card renders, with only motion's runtime stubbed: `motion.article`
 * / `motion.span` become plain tags that record (then drop) their animation
 * props. The snapshot therefore captures the shipped DOM — overlay link,
 * favorite button state, badge, price, CTA classes — without inline
 * animation state. Router/session are stubbed anonymous (no redirects fire
 * during render).
 */

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  const ReactMod = await import("react");

  const MOTION_ONLY = new Set([
    "whileHover",
    "whileTap",
    "whileInView",
    "transition",
    "initial",
    "animate",
    "exit",
    "variants",
    "viewport",
    "style",
  ]);

  function makeStub(tag: string) {
    return ReactMod.forwardRef(function MotionStub(
      {
        children,
        ...props
      }: { children?: React.ReactNode } & Record<string, unknown>,
      ref: ForwardedRef<unknown>,
    ) {
      const domProps = Object.fromEntries(
        Object.entries(props).filter(([key]) => !MOTION_ONLY.has(key)),
      );
      return ReactMod.createElement(tag, { ...domProps, ref }, children);
    });
  }

  return {
    ...actual,
    useReducedMotion: () => false,
    motion: new Proxy(
      {},
      {
        get: (_target, prop) =>
          typeof prop === "string" ? makeStub(prop) : undefined,
      },
    ),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null, isPending: false }),
}));

import ProductCard from "../ProductCard";

const PRODUCT = {
  slug: "dummy-93",
  variantId: "variant-93",
  title: "Felted wool throw",
  priceCents: 6800,
  image: "/landing/deck-1.webp",
  description: "A quiet layer for slow evenings.",
};

afterEach(() => {
  cleanup();
  useFavoritesStore.setState({ items: [], serverSlugs: [] });
});

/** Strip framework-derived values so consecutive runs are byte-identical. */
function normalize(html: string): string {
  return (
    html
      .replaceAll(/\/_next\/image\?url=([^&"'\s]+)[^"'\s]*/g, (_match, url: string) =>
        decodeURIComponent(url),
      )
      .replaceAll(/\s+srcset="[^"]*"/g, "")
      .replaceAll(/:r\d+:/g, "STABLE-ID")
      .replaceAll(/radix-[A-Za-z0-9-]+/g, "radix-STABLE-ID")
  );
}

describe("ProductCard snapshot", () => {
  it("matches the default rendered output", () => {
    const { container, getByText } = render(<ProductCard {...PRODUCT} />);
    const html = normalize(container.innerHTML);

    expect(html).toContain(PRODUCT.title);
    expect(getByText("$68.00")).toBeTruthy();

    expect(html).toMatchSnapshot();
  });

  it("matches the popular + favorited rendered output", () => {
    useFavoritesStore.setState({
      items: [
        {
          productSlug: PRODUCT.slug,
          variantId: PRODUCT.variantId,
          title: PRODUCT.title,
          priceCents: PRODUCT.priceCents,
          image: PRODUCT.image,
          description: PRODUCT.description,
        },
      ],
    });

    const { container } = render(<ProductCard {...PRODUCT} isPopular />);
    const html = normalize(container.innerHTML);

    expect(html).toContain("Popular");
    expect(html).toContain('aria-pressed="true"');

    expect(html).toMatchSnapshot();
  });
});
