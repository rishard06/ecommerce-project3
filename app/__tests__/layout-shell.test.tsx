// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Direction C layout shell contract (Task 2).
 *
 * The assertions read the real stylesheet and the rendered header/footer so a
 * later section task cannot silently shrink the container, flatten the bento
 * tracks, or reintroduce viewport units that break on mobile browser chrome.
 *
 * Values come verbatim from the mockup:
 * - `.shell` — `min(1240px, 100% - 48px)`, centered.
 * - `.bento` — 4 explicit tracks, 196px rows, 13px gap; 2 tracks @980px,
 *   1 track @540px.
 * - `.display` — `clamp(3.5rem, 8.4vw, 8.1rem)`, line-height .88,
 *   letter-spacing -.05em; Fraunces with lime italic `em` + outline word.
 * - Hero — `100dvh` (never `100vw`/`100vh`), `overflow: clip`.
 * - Media slots reserve `aspect-ratio`; card internals use container queries.
 */

const ROOT = process.cwd();
const CSS = readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
const HEADER_SRC = readFileSync(
  path.join(ROOT, "components", "layout", "Header.tsx"),
  "utf8",
);
const FOOTER_SRC = readFileSync(
  path.join(ROOT, "components", "layout", "Footer.tsx"),
  "utf8",
);
const MESH_SRC = readFileSync(
  path.join(ROOT, "components", "layout", "MeshGradientBackground.tsx"),
  "utf8",
);
const NAVBAR_SRC = readFileSync(
  path.join(ROOT, "components", "layout", "NavBar.tsx"),
  "utf8",
);

vi.mock("@/components/marketing/Hero", () => ({
  default: () => <div data-testid="hero-copy" />,
}));

vi.mock("@/components/layout/MeshGradientBackground", () => ({
  default: () => <div data-testid="mesh-mock" />,
}));

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

afterEach(cleanup);

/** Strip comments before scanning source for forbidden patterns. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** Return the contents of the block whose `{` follows `from`. */
function braceBlock(source: string, from: number): string {
  const open = source.indexOf("{", from);
  if (open === -1) throw new Error("Expected a CSS block to open");

  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }

  throw new Error("Unterminated CSS block");
}

/** Extract a top-level block by selector. */
function block(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(`^[\\t ]*${escaped}[\\t ]*\\{`, "m"),
  );
  if (!match || match.index === undefined) {
    throw new Error(`CSS block "${selector}" not found`);
  }
  return braceBlock(source, match.index);
}

/** Extract a max-width media block. */
function mediaBlock(source: string, width: number): string {
  const match = source.match(
    new RegExp(`@media\\s*\\(\\s*max-width:\\s*${width}px\\s*\\)\\s*\\{`),
  );
  if (!match || match.index === undefined) {
    throw new Error(`@media (max-width: ${width}px) not found`);
  }
  return braceBlock(source, match.index);
}

describe("shell container", () => {
  it("uses the mockup width: min(1240px, 100% - 48px), centered", () => {
    const shell = block(CSS, ".shell");
    expect(shell).toMatch(
      /width:\s*min\(\s*1240px\s*,\s*calc\(\s*100%\s*-\s*48px\s*\)\s*\)/,
    );
    expect(shell).toMatch(/margin-inline:\s*auto/);
  });

  it("lets grid children shrink instead of forcing overflow", () => {
    expect(CSS).toMatch(/min-inline-size:\s*0/);
  });

  it("keeps the site header sticky with the translucent glass treatment", () => {
    // NavBar owns the header bar; Header.tsx owns the hero below it.
    expect(NAVBAR_SRC).toContain("sticky top-0");
    expect(NAVBAR_SRC).toContain("glass-control");
  });

  it("wraps the landing hero content in the shell", () => {
    const { container } = render(<Header />);

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.className).toContain("hero");

    const shell = header?.querySelector(":scope > .shell");
    expect(shell).not.toBeNull();
    expect(shell?.querySelector("[data-testid='hero-copy']")).not.toBeNull();
  });

  it("wraps the footer in the shell and closes with an outline wordmark", () => {
    const { container } = render(<Footer />);

    expect(container.querySelector("footer .shell")).not.toBeNull();
    const wordmark = container.querySelector("footer .wordmark");
    expect(wordmark).not.toBeNull();
    expect(wordmark?.textContent).toMatch(/tended/i);
    expect(wordmark?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("bento grid", () => {
  it("uses explicit 4-column tracks with mockup row height and gap", () => {
    const bento = block(CSS, ".bento");
    expect(bento).toMatch(/display:\s*grid/);
    expect(bento).toMatch(/grid-template-columns:\s*repeat\(\s*4\s*,\s*1fr\s*\)/);
    expect(bento).toMatch(/grid-auto-rows:\s*196px/);
    expect(bento).toMatch(/gap:\s*13px/);
  });

  it("collapses to 2 tracks at 980px and 1 track at 540px", () => {
    const tablet = block(mediaBlock(CSS, 980), ".bento");
    expect(tablet).toMatch(/grid-template-columns:\s*repeat\(\s*2\s*,\s*1fr\s*\)/);

    const phone = block(mediaBlock(CSS, 540), ".bento");
    expect(phone).toMatch(/grid-template-columns:\s*1fr/);
    expect(phone).toMatch(/grid-auto-rows:\s*auto/);
  });

  it("sizes card internals with container queries, not the viewport", () => {
    expect(CSS).toMatch(/container-type:\s*inline-size/);
    expect(CSS).toContain("@container");
  });
});

describe("display type", () => {
  it("uses the bounded mockup clamp (max <= 2.5x min)", () => {
    const display = block(CSS, ".display");
    const clamp = display.match(
      /font-size:\s*clamp\(\s*([\d.]+)rem\s*,\s*[^,]+,\s*([\d.]+)rem\s*\)/,
    );
    expect(clamp).not.toBeNull();

    const min = Number.parseFloat((clamp as RegExpMatchArray)[1]);
    const max = Number.parseFloat((clamp as RegExpMatchArray)[2]);
    expect(min).toBe(3.5);
    expect(max).toBe(8.1);
    expect(max / min).toBeLessThanOrEqual(2.5);

    expect(display).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(display).toMatch(/line-height:\s*0?\.88/);
    expect(display).toMatch(/letter-spacing:\s*-0?\.05em/);
  });

  it("sets the italic emphasis in the accent (lime) token", () => {
    const em = block(CSS, ".display em");
    expect(em).toMatch(/font-style:\s*italic/);
    expect(em).toMatch(/color:\s*var\(--accent-text\)/);
  });

  it("keeps an outline word treatment for the hero and footer", () => {
    const outline = block(CSS, ".display-outline");
    expect(outline).toMatch(/color:\s*transparent/);
    expect(outline).toMatch(/-webkit-text-stroke:\s*1\.5px/);

    const wordmark = block(CSS, ".wordmark");
    expect(wordmark).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(wordmark).toMatch(/font-size:\s*clamp\(\s*4\.5rem\s*,\s*15vw\s*,\s*13rem\s*\)/);
    expect(wordmark).toMatch(/-webkit-text-stroke:\s*1px/);
    expect(wordmark).toMatch(/user-select:\s*none/);
  });

  it("keeps the display font, shadow, and easing aliases in @theme", () => {
    const theme = block(CSS, "@theme inline");
    expect(theme).toMatch(/--font-display:/);
    expect(theme).toMatch(/--shadow-panel:/);
    expect(theme).toMatch(/--ease-out-quart:/);
  });
});

describe("hero sizing and overflow", () => {
  it("sizes the hero with 100dvh and clips instead of hiding", () => {
    const hero = block(CSS, ".hero");
    expect(hero).toContain("100dvh");
    expect(hero).not.toMatch(/100vh/);
    expect(hero).not.toMatch(/100vw/);
    expect(hero).toMatch(/overflow:\s*clip/);
    expect(hero).toMatch(/place-items:\s*safe\s+center/);
  });

  it("reserves media space with aspect-ratio and clip", () => {
    const slot = block(CSS, ".media-slot");
    expect(slot).toMatch(/aspect-ratio:\s*4\s*\/\s*3/);
    expect(slot).toMatch(/overflow:\s*clip/);
  });

  it("never masks layout gaps with overflow: hidden", () => {
    const sources: Array<[string, string]> = [
      ["globals.css", CSS],
      ["Header.tsx", HEADER_SRC],
      ["Footer.tsx", FOOTER_SRC],
      ["MeshGradientBackground.tsx", MESH_SRC],
    ];

    for (const [name, source] of sources) {
      expect(stripComments(source), `${name} must not use overflow:hidden`).not.toMatch(
        /overflow:\s*hidden|overflow-hidden/,
      );
    }
  });
});

describe("mesh backdrop", () => {
  it("reads Direction C green/lime theme tokens instead of raw hex", () => {
    for (const token of ["--mesh-deep", "--mesh-mid", "--mesh-lime"]) {
      expect(CSS, `${token} missing from globals.css`).toContain(token);
      expect(MESH_SRC, `${token} missing from the mesh`).toContain(token);
    }

    expect(stripComments(MESH_SRC)).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("keeps the mobile WebGL gate, reduced-motion opt-out, grain, and clip", () => {
    expect(MESH_SRC).toContain("useReducedMotion");
    expect(MESH_SRC).toMatch(/matchMedia\(\s*["']\(max-width:\s*768px\)["']\s*\)/);
    expect(MESH_SRC).toContain("data-grain");
    expect(MESH_SRC).toContain("overflow-clip");
  });
});

describe("interaction targets in the shell", () => {
  it("keeps every footer clickable cursor-pointer and 44px social targets", () => {
    const { container } = render(<Footer />);

    for (const link of container.querySelectorAll("a")) {
      expect(link.className).toContain("cursor-pointer");
    }

    const social = screen.getByRole("link", { name: "Facebook" });
    expect(social.className).toContain("size-11");

    const submit = screen.getByRole("button", {
      name: /subscribe to newsletter/i,
    });
    expect(submit.className).toContain("size-11");
    expect(submit.className).toContain("cursor-pointer");
  });

  it("uses gap utilities instead of space-y in the footer", () => {
    expect(FOOTER_SRC).not.toMatch(/\bspace-[xy]-/);
  });
});
