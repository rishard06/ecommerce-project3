// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Direction C component-state contract (Task 5).
 *
 * The C mockup's `.btn` / `.ghost` / `.tile` values are the source of truth:
 * lime fill with a fixed ink label, glow + 0.975 press, a real 2px focus ring,
 * and an actual border on every surface so forced-colors can keep the shape
 * after it drops shadows and translucent fills.
 */

const ROOT = process.cwd();
const read = (...parts: string[]) =>
  readFileSync(path.join(ROOT, ...parts), "utf8");

const CSS = read("app", "globals.css");
const BUTTON = read("components", "ui", "button.tsx");
const CARD = read("components", "ui", "card.tsx");
const BADGE = read("components", "ui", "badge.tsx");
const SKELETON = read("components", "ui", "skeleton.tsx");

const TILE_SOURCES = [
  read("features", "products", "components", "FeatureProducts.tsx"),
  read("features", "products", "components", "ProductCard.tsx"),
  read("features", "products", "components", "Category.tsx"),
  read("components", "marketing", "Features.tsx"),
  read("components", "marketing", "Testimonies.tsx"),
  read("components", "marketing", "DropAlert.tsx"),
] as const;

/** Block contents for an at-rule such as `@media (forced-colors: active)`. */
function mediaBlock(source: string, query: string): string {
  const match = source.match(
    new RegExp(`@media\\s*\\(\\s*${query}\\s*\\)\\s*\\{`),
  );
  if (!match || match.index === undefined) {
    throw new Error(`@media (${query}) not found`);
  }

  const open = source.indexOf("{", match.index);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }

  throw new Error(`@media (${query}) is unterminated`);
}

/** Prose may mention a token; only executable class strings count. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/**
 * True when the forced-colors at-rule sits outside every `@layer` block.
 *
 * Cascade order, not selector order, decides the outcome here: a layered
 * `outline: 2px solid Highlight` loses to Tailwind's utility-layer
 * `outline-none` on Button. The block must be unlayered (like the
 * reduced-motion pulse rule) to win regardless of utility order.
 */
function forcedColorsIsUnlayered(source: string): boolean {
  const code = stripComments(source);
  const stack: boolean[] = [];
  let start = 0;

  for (let i = 0; i < code.length; i += 1) {
    if (code[i] === "{") {
      const prelude = code.slice(start, i).trim();
      if (prelude.startsWith("@media") && /forced-colors/.test(prelude)) {
        return !stack.some(Boolean);
      }
      stack.push(prelude.startsWith("@layer"));
      start = i + 1;
    } else if (code[i] === "}") {
      stack.pop();
      start = i + 1;
    } else if (code[i] === ";") {
      start = i + 1;
    }
  }

  throw new Error("@media (forced-colors: active) not found");
}

afterEach(cleanup);

describe("lime CTA", () => {
  it("uses the C fill, hover glow, 0.975 press, and a 2px focus ring", () => {
    render(<Button>Shop the drop</Button>);
    const cta = screen.getByRole("button", { name: "Shop the drop" });

    expect(cta.className).toContain("bg-action");
    expect(cta.className).toContain("text-action-foreground");
    expect(cta.className).toContain("hover:bg-action-hover");
    expect(cta.className).toContain("hover:shadow-glow");
    expect(cta.className).toContain("active:scale-[0.975]");
    expect(cta.className).toContain("focus-visible:ring-2");
    expect(cta.className).toContain("cursor-pointer");
    // 44px C mockup CTA, not the old 36px shadcn default.
    expect(cta.className).toContain("h-11");
  });

  it("keeps every transition inside the 160-180ms transform band", () => {
    expect(BUTTON).toContain("duration-[170ms]");
    expect(BUTTON).not.toMatch(/duration-(?:200|300|500|700)\b/);
    expect(CARD).toContain("duration-[180ms]");
  });

  it("sizes icons from the base rule so data-icon needs no size class", () => {
    expect(BUTTON).toContain("[&_svg:not([class*='size-'])]:size-4");
  });

  it("has no dark: overrides in the touched primitives", () => {
    for (const source of [BUTTON, CARD, BADGE]) {
      expect(stripComments(source)).not.toMatch(/\bdark:/);
    }
  });
});

describe("ghost control", () => {
  it("matches the C outlined pill and keeps a 44px icon target", () => {
    render(<Button variant="ghost" size="icon" aria-label="Search" />);
    const ghost = screen.getByRole("button", { name: "Search" });

    expect(ghost.className).toContain("border-line-strong");
    expect(ghost.className).toContain("hover:border-accent-text/50");
    expect(ghost.className).toContain("hover:text-accent-text");
    expect(ghost.className).toContain("size-11");
    expect(ghost.className).toContain("cursor-pointer");
  });
});

describe("surface primitives", () => {
  it("gives Card a real border and clipped overflow instead of a ring", () => {
    const { container } = render(<Card>Tile</Card>);
    const card = container.querySelector<HTMLElement>('[data-slot="card"]');

    expect(card).not.toBeNull();
    expect(card!.className).toContain("border");
    expect(card!.className).toContain("border-border");
    expect(card!.className).toContain("overflow-clip");
    expect(card!.className).not.toContain("ring-1");
  });

  it("makes the default Badge the lime chip with fixed ink", () => {
    render(<Badge>Popular</Badge>);
    const badge = screen.getByText("Popular");

    expect(badge.getAttribute("data-slot")).toBe("badge");
    expect(badge.className).toContain("bg-action");
    expect(badge.className).toContain("text-action-foreground");
    expect(badge.className).toContain("focus-visible:ring-2");
    expect(badge.className).toContain("border-transparent");
    expect(badge.className).not.toContain("hover:bg-action");
  });

  it("keeps a hairline border on every bento tile", () => {
    for (const source of TILE_SOURCES) {
      expect(source).toMatch(/border-line(?!-strong)/);
    }
  });
});

describe("forced-colors fallbacks", () => {
  const forced = mediaBlock(CSS, "forced-colors:\\s*active");

  it("draws system-colour borders on tiles and buttons", () => {
    expect(forced).toMatch(
      /\[data-tile\][\s\S]*?\{[^}]*border:\s*1px solid CanvasText/,
    );
    expect(forced).toMatch(
      /\[data-slot="button"\][\s\S]*?\{[^}]*border:\s*1px solid ButtonText/,
    );
  });

  it("keeps the outline wordmark and drops the decorative mesh", () => {
    expect(forced).toMatch(/\.wordmark[\s\S]*?\{[^}]*color:\s*CanvasText/);
    expect(forced).toMatch(/\.mesh[\s\S]*?\{[^}]*display:\s*none/);
  });

  it("uses a Highlight outline for keyboard focus", () => {
    expect(forced).toMatch(
      /\[data-slot="button"\]:focus-visible[\s\S]*?outline:\s*2px solid Highlight/,
    );
  });

  it("keeps the forced-colors block unlayered so utility outlines cannot win", () => {
    // `outline-none` lives in Tailwind's utility layer. Only an unlayered
    // rule beats it, so this asserts cascade position, not just the text.
    expect(forcedColorsIsUnlayered(CSS)).toBe(true);
  });
});

describe("nested scrolling and reduced motion", () => {
  it("reserves the vertical gutter and contains nested scroll chaining", () => {
    expect(CSS).toMatch(/html\s*\{[^}]*scrollbar-gutter:\s*stable/);
    expect(CSS).toMatch(
      /\.custom-scrollbar\s*\{[^}]*scrollbar-gutter:\s*stable/,
    );
    expect(CSS).toMatch(
      /\.custom-scrollbar\s*\{[^}]*overscroll-behavior:\s*contain/,
    );
  });

  it("stops decorative pulses under reduce but leaves loading spinners", () => {
    expect(CSS).toMatch(
      /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{[\s\S]*?\.animate-pulse\s*\{[^}]*animation:\s*none/,
    );
    expect(CSS).not.toMatch(/\.animate-spin\s*\{/);
    // The skeleton stays a visible surface when its pulse is frozen.
    expect(SKELETON).toContain("bg-muted");
  });
});
