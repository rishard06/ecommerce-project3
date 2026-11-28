// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Direction C theme contract — the foundation Tasks 2-5 consume.
 *
 * `:root` is dark-first (C mockup values). A `prefers-color-scheme: light`
 * fallback keeps the sage canvas for light-OS users, and `light-dark()` is the
 * progressive enhancement. The assertions read the real token sheet, so a
 * rename or a one-theme-only edit fails here instead of in a screenshot.
 */

const ROOT = process.cwd();
const CSS = readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
const LAYOUT = readFileSync(path.join(ROOT, "app", "layout.tsx"), "utf8");

type Declarations = Record<string, string>;

/** Return the contents of the block whose `{` follows `from`. */
function braceBlock(source: string, from: number): string {
  const open = source.indexOf("{", from);
  if (open === -1) throw new Error("Expected a CSS block to open");

  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }

  throw new Error("Unterminated CSS block");
}

/** Extract a top-level block by selector. */
function block(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^[\\t ]*${escaped}[\\t ]*\\{`, "m"));
  if (!match || match.index === undefined) {
    throw new Error(`CSS block "${selector}" not found`);
  }
  return braceBlock(source, match.index);
}

/** Extract an at-rule block, e.g. `prefers-color-scheme:\s*light`. */
function mediaBlock(source: string, query: string): string {
  const match = source.match(
    new RegExp(`@media\\s*\\(\\s*${query}\\s*\\)\\s*\\{`),
  );
  if (!match || match.index === undefined) {
    throw new Error(`@media (${query}) not found`);
  }
  return braceBlock(source, match.index);
}

/** Flatten `property: value` declarations, dropping comments. */
function declarations(source: string): Declarations {
  const result: Declarations = {};
  for (const chunk of source.split(";")) {
    const declaration = chunk.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;
    result[declaration.slice(0, separator).trim()] = declaration
      .slice(separator + 1)
      .trim();
  }
  return result;
}

const root = declarations(block(CSS, ":root"));
const dark = declarations(block(CSS, ".dark"));
const theme = declarations(block(CSS, "@theme inline"));

/** The light fallback lives inside the OS-light media query. */
function light(): Declarations {
  return declarations(
    block(
      mediaBlock(CSS, "prefers-color-scheme:\\s*light"),
      ":root:not(.dark)",
    ),
  );
}

const normalize = (value: string) => value.replace(/\s+/g, "").toLowerCase();

/** Inject the real dark-first `:root` so jsdom can resolve the cascade. */
beforeAll(() => {
  const style = document.createElement("style");
  style.textContent = `:root {\n${Object.entries(root)
    .map(([property, value]) => `${property}: ${value};`)
    .join("\n")}\n}`;
  document.head.append(style);
});

function computed(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function channels(value: string): [number, number, number] {
  const hex = normalize(value).match(/^#([0-9a-f]{6})$/);
  if (!hex) throw new Error(`Expected a six-digit hex colour, got "${value}"`);
  return [0, 2, 4].map((offset) =>
    parseInt(hex[1].slice(offset, offset + 2), 16),
  ) as [number, number, number];
}

function luminance(value: string): number {
  const [r, g, b] = channels(value).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("browser UI theming", () => {
  it("advertises light and dark on :root", () => {
    expect(root["color-scheme"]).toBe("light dark");

    const scheme = getComputedStyle(document.documentElement).colorScheme;
    expect(scheme).toContain("light");
    expect(scheme).toContain("dark");
  });

  it("themes native controls and selection without a scrollbar transition", () => {
    expect(root["accent-color"]).toContain("--action");
    expect(root["scrollbar-color"]).toBeTruthy();

    // WebKit repaints the whole scroller when scrollbar-color animates.
    // Strip comments first: prose is allowed to mention the rule.
    const withoutComments = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/transition[^;{}]*scrollbar-color/);
    expect(CSS).toMatch(/::selection\s*\{[^}]*var\(--action\)/);
  });

  it("sets the viewport color-scheme meta so native chrome never flashes", () => {
    expect(LAYOUT).toMatch(/colorScheme:\s*"light dark"/);
  });
});

describe("dark-first defaults", () => {
  const expected: Array<[string, string]> = [
    ["--background", "#0c1311"],
    ["--foreground", "#f1f7f3"],
    ["--panel", "#121c18"],
    ["--panel-2", "#16221d"],
    ["--action", "#ccf381"],
    ["--action-hover", "#d8fa9a"],
    ["--action-foreground", "#0c1311"],
    ["--accent-text", "#ccf381"],
  ];

  for (const [token, value] of expected) {
    it(`resolves ${token} to ${value}`, () => {
      expect(normalize(computed(token))).toBe(value);
    });
  }

  it("keeps the Direction C ink scale", () => {
    expect(normalize(computed("--ink-2"))).toBe("#c2d1c9");
    expect(normalize(computed("--muted-foreground"))).toBe("#93a79d");
  });

  it("draws hairlines as translucent white", () => {
    expect(normalize(computed("--line"))).toBe("rgba(255,255,255,0.09)");
    expect(normalize(computed("--line-strong"))).toBe(
      "rgba(255,255,255,0.16)",
    );
  });

  it("pins the dark palette behind an explicit .dark class", () => {
    expect(dark["color-scheme"]).toBe("dark");
    expect(normalize(dark["--background"] ?? "")).toBe("#0c1311");
    expect(normalize(dark["--action"] ?? "")).toBe("#ccf381");
  });
});

describe("light fallback", () => {
  it("preserves the sage canvas and ink", () => {
    expect(normalize(light()["--background"])).toBe("#f5faf8");
    expect(normalize(light()["--foreground"])).toBe("#101a17");
  });

  it("defines a light counterpart for every Direction C token", () => {
    const fallback = light();
    for (const token of [
      "--panel",
      "--panel-2",
      "--line",
      "--line-strong",
      "--ink-2",
      "--action",
      "--action-hover",
      "--action-foreground",
      "--accent-text",
    ]) {
      expect(
        fallback[token],
        `${token} missing from light fallback`,
      ).toBeTruthy();
    }
  });

  it("only applies while .dark is absent", () => {
    expect(CSS).toContain(":root:not(.dark)");
  });
});

describe("action contrast", () => {
  it("labels the dark action fill at WCAG AA", () => {
    expect(
      contrast(computed("--action"), computed("--action-foreground")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("labels the light action fill at WCAG AA", () => {
    const fallback = light();
    expect(
      contrast(fallback["--action"], fallback["--action-foreground"]),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("progressive enhancement", () => {
  it("upgrades the palette with light-dark() where supported", () => {
    expect(CSS).toMatch(
      /@supports\s*\(color:\s*light-dark\([^)]*,[^)]*\)\)/,
    );
  });

  it("exports Tailwind aliases for the Task 2-5 token names", () => {
    expect(theme["--color-panel"]).toBe("var(--panel)");
    expect(theme["--color-panel-2"]).toBe("var(--panel-2)");
    expect(theme["--color-line"]).toBe("var(--line)");
    expect(theme["--color-line-strong"]).toBe("var(--line-strong)");
    expect(theme["--color-ink-2"]).toBe("var(--ink-2)");
    expect(theme["--color-action"]).toBe("var(--action)");
    expect(theme["--color-accent-text"]).toBe("var(--accent-text)");
  });
});
