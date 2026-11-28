import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Theme-token rendered-output snapshot (light + dark).
 *
 * Components snapshot class names; this suite snapshots what those classes
 * resolve to. The maps below are the fully `var()`-resolved values from the
 * real `app/globals.css` for each theme, plus the Tailwind alias block the
 * components consume (`bg-action`, `text-accent-text`, ...). Any token edit
 * that shifts rendered colour fails here — including edits that only look
 * right in one theme.
 *
 * Determinism: pure file read + string resolution, keys sorted, no dates,
 * no ids, no animation.
 */

const ROOT = process.cwd();
const CSS = readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");

type Tokens = Record<string, string>;

/** Extract the declarations of a top-level CSS block by selector. */
function cssBlock(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^[\\t ]*${escaped}[\\t ]*\\{`, "m"));
  if (!match || match.index === undefined) {
    throw new Error(`CSS block "${selector}" not found`);
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
  throw new Error(`CSS block "${selector}" is unterminated`);
}

function declarations(block: string): Tokens {
  const tokens: Tokens = {};
  for (const line of block.split(";")) {
    const declaration = line.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;
    const name = declaration.slice(0, separator).trim();
    if (!name.startsWith("--")) continue;
    tokens[name] = declaration.slice(separator + 1).trim();
  }
  return tokens;
}

/** Extract an at-rule block, e.g. `prefers-color-scheme: light`. */
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

const rootTokens = declarations(cssBlock(CSS, ":root"));
const darkOverrides = declarations(cssBlock(CSS, ".dark"));
/* Dark-first `:root` + the OS-light fallback, matching browser resolution. */
const lightOverrides = declarations(
  cssBlock(
    mediaBlock(CSS, "prefers-color-scheme:\\s*light"),
    ":root:not(.dark)",
  ),
);

/** Resolve `var(--x)` chains for one theme, walking :root then theme overrides. */
function themeTokens(theme: "light" | "dark"): Tokens {
  const lookup = (name: string): string | undefined =>
    theme === "dark"
      ? (darkOverrides[name] ?? rootTokens[name])
      : (lightOverrides[name] ?? rootTokens[name]);

  const resolved: Tokens = {};
  for (const name of Object.keys({ ...rootTokens, ...darkOverrides }).sort()) {
    let value = lookup(name) ?? "";
    for (let hops = 0; value.includes("var("); hops += 1) {
      if (hops > 10) throw new Error(`Unresolvable var() chain for ${name}`);
      value = value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_full, ref: string) => {
        const next = lookup(ref);
        if (!next) throw new Error(`Missing token ${ref} referenced by ${name}`);
        return next;
      });
    }
    resolved[name] = value.trim();
  }
  return resolved;
}

describe("theme token snapshots", () => {
  it("matches the resolved light-theme tokens", () => {
    const tokens = themeTokens("light");

    // Read-once check: the snapshot must pin the tokens the UI snapshots
    // actually render through.
    expect(tokens["--action"]).toBeTruthy();
    expect(tokens["--accent-text"]).toBeTruthy();

    expect(tokens).toMatchSnapshot();
  });

  it("matches the resolved dark-theme tokens", () => {
    const tokens = themeTokens("dark");

    expect(tokens["--action"]).toBeTruthy();
    expect(tokens["--accent-text"]).toBeTruthy();

    expect(tokens).toMatchSnapshot();
  });

  it("matches the Tailwind alias block", () => {
    const aliases = Object.fromEntries(
      Object.entries(declarations(cssBlock(CSS, "@theme inline"))).sort(
        ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
      ),
    );

    expect(aliases["--color-action"]).toBe("var(--action)");
    expect(aliases["--color-accent-text"]).toBe("var(--accent-text)");

    expect(aliases).toMatchSnapshot();
  });
});
