// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Ticker from "@/components/marketing/Ticker";

/**
 * Direction C motion contract (Task 3).
 *
 * Motion is opt-in: the default sheet is static and every ambient animation
 * lives inside `@media (prefers-reduced-motion: no-preference)`. This suite
 * pins the three behaviours Tasks 4-5 inherit:
 * - no global `animation-duration: 0.01ms` kill (the old reduced-motion rule);
 * - the ticker loop is declared only in no-preference and freezes readable
 *   (`transform: none`, `opacity: 1`) when motion is reduced;
 * - the ticker owns a visible, keyboard-reachable Pause/Play control with a
 *   polite live status, and never lies about state with `aria-pressed`.
 *
 * Compositor rules: `transform`/`opacity` only, 160-180ms, ease-out-quart.
 * Ticker values come verbatim from the C mockup: `translateX(-50%) 55s linear`,
 * 36px gap, 13px band padding.
 */

const ROOT = process.cwd();
const CSS = readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
const TICKER_SRC = readFileSync(
  path.join(ROOT, "components", "marketing", "Ticker.tsx"),
  "utf8",
);

const TICKER_ITEMS = ["Small batch", "Repairable", "Carbon-neutral"] as const;

afterEach(cleanup);

/** Strip comments before scanning source for forbidden patterns. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** Return the contents of the block whose opening brace is at `openIndex`. */
function braceBlock(source: string, openIndex: number): string {
  let depth = 0;

  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }

  throw new Error("Unterminated CSS block");
}

/** Extract the first rule block whose selector starts a line. */
function block(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^[\\t ]*${escaped}[\\t ]*\\{`, "m"));

  if (!match || match.index === undefined) {
    throw new Error(`CSS block "${selector}" not found`);
  }

  return braceBlock(source, source.indexOf("{", match.index));
}

/** Character ranges of every `@media (<query>)` block in the sheet. */
function mediaRanges(source: string, query: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const needle = `@media (${query})`;
  let index = 0;

  while ((index = source.indexOf(needle, index)) !== -1) {
    const open = source.indexOf("{", index);
    if (open === -1) throw new Error(`Unterminated @media (${query})`);

    const body = braceBlock(source, open);
    const end = open + body.length + 2;
    ranges.push([index, end]);
    index = end;
  }

  return ranges;
}

/** The full text of every `@media (<query>)` block. */
function mediaContents(source: string, query: string): string {
  return mediaRanges(source, query)
    .map(([start, end]) => source.slice(start, end))
    .join("\n");
}

/** The sheet with every `@media (<query>)` block removed. */
function withoutMedia(source: string, query: string): string {
  let result = source;

  for (const [start, end] of mediaRanges(source, query).reverse()) {
    result = result.slice(0, start) + result.slice(end);
  }

  return result;
}

describe("reduced-motion policy", () => {
  it("never globally cancels animation or transition durations", () => {
    const source = stripComments(CSS);

    expect(source).not.toMatch(/animation-duration:\s*0\.01ms/);
    expect(source).not.toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(source).not.toMatch(/transition-duration:\s*0\.01ms/);
    expect(source).not.toMatch(/animation:\s*none\s*!important/);
  });

  it("freezes the ticker in its readable final state when motion is reduced", () => {
    const reduce = mediaContents(CSS, "prefers-reduced-motion: reduce");

    expect(reduce).toContain("scroll-behavior: auto");

    const track = block(reduce, ".ticker-track");
    expect(track).toMatch(/transform:\s*none/);
    expect(track).toMatch(/opacity:\s*1/);
  });
});

describe("ticker motion", () => {
  it("runs the 55s marquee only when the user has no motion preference", () => {
    const enabled = stripComments(
      mediaContents(CSS, "prefers-reduced-motion: no-preference"),
    );

    expect(enabled).toMatch(/@keyframes\s+ticker-slide/);
    expect(enabled).toMatch(/translateX\(\s*-50%\s*\)/);

    const track = block(enabled, ".ticker-track");
    expect(track).toMatch(
      /animation:\s*ticker-slide\s+55s\s+linear\s+infinite/,
    );
  });

  it("leaves the ticker static outside the no-preference branch", () => {
    const outside = stripComments(
      withoutMedia(CSS, "prefers-reduced-motion: no-preference"),
    );

    expect(outside).not.toMatch(/@keyframes\s+ticker-slide/);
    expect(outside).not.toMatch(/animation:\s*ticker-slide/);

    const track = block(outside, ".ticker-track");
    expect(track).not.toMatch(/(^|[;{\s])animation\s*:/);
  });

  it("freezes the track on demand without removing it", () => {
    expect(stripComments(CSS)).toMatch(
      /\.ticker-track\[data-paused="true"\]\s*\{[^}]*animation-play-state:\s*paused/,
    );
  });
});

describe("mesh drift", () => {
  it("drifts decorative blobs with transform alone, only under no-preference", () => {
    const enabled = stripComments(
      mediaContents(CSS, "prefers-reduced-motion: no-preference"),
    );

    expect(enabled).toMatch(/@keyframes\s+mesh-drift/);

    const keyframes = block(enabled, "@keyframes mesh-drift");
    expect(keyframes).toMatch(/transform:\s*translate3d/);
    expect(keyframes).not.toMatch(
      /\b(opacity|filter|width|height|top|left|right|bottom)\s*:/,
    );

    const outside = stripComments(
      withoutMedia(CSS, "prefers-reduced-motion: no-preference"),
    );
    expect(outside).not.toMatch(/@keyframes\s+mesh-drift/);
  });
});

describe("press feedback", () => {
  it("transitions transform only, within the 160-180ms window", () => {
    const enabled = stripComments(
      mediaContents(CSS, "prefers-reduced-motion: no-preference"),
    );
    const press = block(enabled, ".press");
    const match = press.match(/transition:\s*transform\s+(\d+)ms/);

    expect(match).not.toBeNull();

    const duration = Number((match as RegExpMatchArray)[1]);
    expect(duration).toBeGreaterThanOrEqual(160);
    expect(duration).toBeLessThanOrEqual(180);
    expect(press).not.toMatch(/box-shadow|background|color|width|height/);
  });

  it("is static by default and still compresses on active", () => {
    const outside = stripComments(
      withoutMedia(CSS, "prefers-reduced-motion: no-preference"),
    );

    expect(outside).not.toMatch(/transition:\s*transform\s+\d+ms/);
    expect(block(outside, ".press:active")).toMatch(
      /transform:\s*scale\(0?\.975\)/,
    );
  });
});

describe("ticker pause control", () => {
  it("renders a visible 44px pause button beside the moving track", () => {
    const { container } = render(<Ticker items={TICKER_ITEMS} />);

    const pause = screen.getByRole("button", { name: "Pause highlights" });
    expect(pause.tagName).toBe("BUTTON");
    expect(pause.className).toContain("h-11");
    expect(pause.className).toContain("cursor-pointer");
    expect(pause.getAttribute("aria-pressed")).toBeNull();
    expect(container.querySelector(".ticker")?.contains(pause)).toBe(true);
    expect(container.querySelector(".ticker-track")).not.toBeNull();
    expect(
      screen.getByRole("region", { name: "Store highlights" }),
    ).toBeTruthy();
  });

  it("is keyboard reachable and toggles its label without aria-pressed", () => {
    render(<Ticker items={TICKER_ITEMS} />);

    const pause = screen.getByRole("button", { name: "Pause highlights" });
    expect(pause.tabIndex).toBe(0);

    pause.focus();
    expect(document.activeElement).toBe(pause);

    // Native buttons activate on Enter/Space; jsdom does not synthesize the
    // click, so dispatch the click the browser would produce.
    fireEvent.keyDown(pause, { key: "Enter" });
    fireEvent.click(pause);

    const play = screen.getByRole("button", { name: "Play highlights" });
    expect(play).toBe(pause);
    expect(play.getAttribute("aria-pressed")).toBeNull();

    fireEvent.keyDown(play, { key: " " });
    fireEvent.click(play);

    expect(screen.getByRole("button", { name: "Pause highlights" })).toBe(
      pause,
    );
  });

  it("announces state politely and marks the track paused", () => {
    const { container } = render(<Ticker items={TICKER_ITEMS} />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");

    const track = container.querySelector(".ticker-track");
    expect(track?.getAttribute("data-paused")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Pause highlights" }),
    );
    expect(track?.getAttribute("data-paused")).toBe("true");
    expect(status).toHaveTextContent(/paused/i);

    fireEvent.click(screen.getByRole("button", { name: "Play highlights" }));
    expect(track?.getAttribute("data-paused")).toBeNull();
    expect(status).toHaveTextContent(/playing/i);
  });

  it("keeps the duplicated marquee copy decorative", () => {
    const { container } = render(<Ticker items={TICKER_ITEMS} />);
    const viewport = container.querySelector(".ticker-track")?.parentElement;

    expect(viewport?.getAttribute("aria-hidden")).toBe("true");
  });

  it("never exposes a pressed state in the ticker owner", () => {
    expect(stripComments(TICKER_SRC)).not.toContain("aria-pressed");
  });
});
