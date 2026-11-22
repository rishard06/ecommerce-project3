import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Theme contract: one action colour (lime) for every CTA, blue reserved for
 * focus ring / informational chrome, and body copy that actually clears WCAG
 * AA (4.5:1) in light *and* dark. These assertions read the real token sheet,
 * so a change that only looks right in one theme fails here.
 */

const ROOT = process.cwd();
const CSS = readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");

type Rgba = { r: number; g: number; b: number; a: number };
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
  return Object.fromEntries(
    Object.entries(allDeclarations(block)).filter(([name]) =>
      name.startsWith("--"),
    ),
  );
}

function allDeclarations(block: string): Tokens {
  const tokens: Tokens = {};
  for (const line of block.split(";")) {
    const declaration = line.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;
    tokens[declaration.slice(0, separator).trim()] = declaration
      .slice(separator + 1)
      .trim();
  }
  return tokens;
}

const rootTokens = declarations(cssBlock(CSS, ":root"));
const darkOverrides = declarations(cssBlock(CSS, ".dark"));

/** Resolve `var(--x)` chains for one theme, walking :root then .dark. */
function themeTokens(theme: "light" | "dark"): Tokens {
  const lookup = (name: string): string | undefined =>
    theme === "dark"
      ? (darkOverrides[name] ?? rootTokens[name])
      : rootTokens[name];

  const resolved: Tokens = {};
  for (const name of Object.keys({ ...rootTokens, ...darkOverrides })) {
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

function parseColor(value: string): Rgba {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = value
    .trim()
    .match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b, a = "1"] = rgb[1].split(",").map((part) => part.trim());
    return {
      r: Number(r),
      g: Number(g),
      b: Number(b),
      a: Number(a),
    };
  }

  throw new Error(`Unsupported colour value: ${value}`);
}

/** Flatten a possibly translucent colour onto an opaque backdrop. */
function composite(foreground: Rgba, backdrop: Rgba): Rgba {
  const mix = (fg: number, bg: number) => fg * foreground.a + bg * (1 - foreground.a);
  return {
    r: mix(foreground.r, backdrop.r),
    g: mix(foreground.g, backdrop.g),
    b: mix(foreground.b, backdrop.b),
    a: 1,
  };
}

function luminance(color: Rgba): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

function contrast(foreground: string, background: string): number {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  // Translucent backgrounds are flattened onto the canvas in `contrastOn`.
  if (bg.a !== 1) {
    throw new Error(`contrast() needs an opaque background, got ${background}`);
  }
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastOn(
  foreground: string,
  background: string,
  canvas: string,
): number {
  const bg = parseColor(background);
  const flattened =
    bg.a === 1 ? background : rgbaToHex(composite(bg, parseColor(canvas)));
  return contrast(foreground, flattened);
}

function rgbaToHex({ r, g, b }: Rgba): string {
  const hex = (value: number) =>
    Math.round(value).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

const THEMES = [
  ["light", themeTokens("light")],
  ["dark", themeTokens("dark")],
] as const;

describe("body copy contrast", () => {
  for (const [theme, tokens] of THEMES) {
    it(`keeps ${theme} body copy at WCAG AA (>= 4.5:1) on the canvas`, () => {
      expect(contrast(tokens["--foreground"], tokens["--background"])).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens["--font-color-secondary"], tokens["--background"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens["--font-color-tertiary"], tokens["--background"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens["--font-color-quaternary"], tokens["--background"]),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it(`keeps ${theme} muted copy at WCAG AA on muted surfaces`, () => {
      expect(
        contrast(tokens["--muted-foreground"], tokens["--muted"]),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokens["--muted-foreground"], tokens["--background"]),
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("glass-component readability", () => {
  const lightGlass = allDeclarations(cssBlock(CSS, ".glass-component"))["background"];
  const darkGlass = allDeclarations(cssBlock(CSS, ".dark .glass-component"))[
    "background"
  ];

  it("keeps light glass copy at WCAG AA", () => {
    const light = themeTokens("light");
    for (const token of [
      "--font-color-secondary",
      "--font-color-tertiary",
      "--font-color-quaternary",
    ] as const) {
      expect(
        contrastOn(light[token], lightGlass, light["--background"]),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps dark glass copy at WCAG AA (composited over the dark canvas)", () => {
    const dark = themeTokens("dark");
    for (const token of [
      "--font-color-secondary",
      "--font-color-tertiary",
      "--font-color-quaternary",
    ] as const) {
      expect(
        contrastOn(dark[token], darkGlass, dark["--background"]),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrastOn(
        dark["--foreground"],
        darkGlass,
        dark["--background"],
      ),
    ).toBeGreaterThanOrEqual(7);
  });
});

describe("single action colour", () => {
  it("uses the same lime action fill in both themes", () => {
    const light = themeTokens("light");
    const dark = themeTokens("dark");
    const lime = rgbaToHex(parseColor(light["--accent-500"]));

    expect(rgbaToHex(parseColor(light["--action"]))).toBe(lime);
    expect(rgbaToHex(parseColor(dark["--action"]))).toBe(lime);
  });

  it("labels the action fill with ink that does not flip in dark mode", () => {
    const light = themeTokens("light");
    const dark = themeTokens("dark");

    expect(
      contrast(light["--action-foreground"], light["--action"]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(dark["--action-foreground"], dark["--action"]),
    ).toBeGreaterThanOrEqual(4.5);

    // The label is the same ink in both themes; only a fixed ink can stay
    // readable on a fill that never changes.
    expect(rgbaToHex(parseColor(dark["--action-foreground"]))).toBe(
      rgbaToHex(parseColor(light["--action-foreground"])),
    );
    // ... and it must not be the theme-flipping body colour (the old bug).
    expect(rgbaToHex(parseColor(dark["--action-foreground"]))).not.toBe(
      rgbaToHex(parseColor(dark["--font-color-primary"])),
    );
  });

  it("reserves blue for the focus ring instead of CTAs", () => {
    for (const [theme, tokens] of THEMES) {
      const ring = parseColor(tokens["--ring"]);
      const action = parseColor(tokens["--action"]);

      // Blue-dominant ring, non-blue action fill.
      expect(ring.b).toBeGreaterThan(ring.r);
      expect(action.b).toBeLessThan(action.r);
      expect(rgbaToHex(action)).not.toBe(rgbaToHex(ring));
      expect(ring.b).toBeGreaterThan(action.b);
      expect(theme).toBeTruthy();
    }
  });

  it("exposes Tailwind aliases for the action tokens", () => {
    const theme = declarations(cssBlock(CSS, "@theme inline"));
    expect(theme["--color-action"]).toBe("var(--action)");
    expect(theme["--color-action-hover"]).toBe("var(--action-hover)");
    expect(theme["--color-action-foreground"]).toBe("var(--action-foreground)");
  });
});

/* ------------------------------------------------------------------------- *
 * Source contracts: a token nobody uses would still pass the maths above.
 * ------------------------------------------------------------------------- */

function collectSources(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSources(relative, files);
    else if (entry.name.endsWith(".tsx")) files.push(relative);
  }
  return files;
}

const COMPONENT_SOURCES = ["app", "components", "features"].flatMap((dir) =>
  collectSources(dir),
);

describe("CTA source contract", () => {
  it("makes the default Button the single action colour", () => {
    const source = readFileSync(
      path.join(ROOT, "components", "ui", "button.tsx"),
      "utf8",
    );

    expect(source).toMatch(
      /default:\s*"bg-action text-action-foreground[^"]*hover:bg-action-hover/,
    );
  });

  it("never labels a lime fill with a theme-flipping text token", () => {
    // Solid (or >= 50% opacity) lime fills keep ink labels. Low-opacity lime
    // tints are decorative surfaces and may sit under normal body copy.
    const limeFill =
      /(?:^|[\s"'])bg-accent-500(?:\/(?:\d{1,2}|100))?(?![\d/])/;
    const flippingLabel =
      /(?:^|[\s"'])(?:hover:)?text-(?:white|gray-(?:primary|secondary|tertiary|quaternary))(?![\w-])/;

    const offenders = COMPONENT_SOURCES.filter((file) => {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      return source.split("\n").some((line) => {
        const fill = line.match(limeFill);
        if (!fill) return false;
        const opacity = fill[0].match(/\/(\d{1,3})/);
        if (opacity && Number(opacity[1]) < 50) return false;
        return flippingLabel.test(line);
      });
    });

    expect(offenders).toEqual([]);
  });

  it("never labels an ink fill with white in dark mode", () => {
    // `--font-color-primary` is near-white in dark mode, so a white label on an
    // ink fill disappears (1.1:1). The inverse label is `text-background`.
    const inkFill = /(?:^|[\s"'])bg-gray-primary(?![\w/-])/;
    const whiteLabel = /(?:^|[\s"'`])text-white(?![\w-])/;

    const offenders = COMPONENT_SOURCES.filter((file) => {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      return source.split("\n").some(
        (line) => inkFill.test(line) && whiteLabel.test(line),
      );
    });

    expect(offenders).toEqual([]);
  });

  it("does not use ad-hoc hex colours in CTA components", () => {
    const ctaFiles = [
      "features/products/components/ProductCard.tsx",
      "features/cart/components/CartPreview.tsx",
      "features/cart/components/OrderSummary.tsx",
      "features/auth/components/LoginForm.tsx",
      "features/auth/components/RegisterForm.tsx",
      "components/marketing/Hero.tsx",
      "components/ui/button.tsx",
    ];

    for (const file of ctaFiles) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      expect(source, `${file} should not hardcode a hex colour`).not.toMatch(
        /#[0-9a-f]{3,8}\b/i,
      );
    }
  });
});

/* ------------------------------------------------------------------------- *
 * Accent text: `--accent-700` is a raw brand scale colour (lime), not a
 * readable foreground on the sage canvas. Accent copy uses the semantic
 * `--accent-text` token instead: an olive in light, the lime in dark.
 * ------------------------------------------------------------------------- */

describe("accent text token", () => {
  it("exposes a semantic Tailwind alias", () => {
    const theme = declarations(cssBlock(CSS, "@theme inline"));
    expect(theme["--color-accent-text"]).toBe("var(--accent-text)");
  });

  for (const [theme, tokens] of THEMES) {
    it(`keeps ${theme} accent text at WCAG AA (>= 4.5:1) on the canvas`, () => {
      expect(
        contrast(tokens["--accent-text"], tokens["--background"]),
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("keeps light accent text readable on the tints used by badges and avatars", () => {
    const light = themeTokens("light");

    // bg-accent-500/20–/30 sits under the badge, avatar and icon-tile labels.
    for (const opacity of [0.2, 0.25, 0.3]) {
      expect(
        contrastOn(
          light["--accent-text"],
          `rgba(204, 243, 129, ${opacity})`,
          light["--background"],
        ),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("steps off the lime scale in light mode but keeps the lime in dark mode", () => {
    const light = themeTokens("light");
    const dark = themeTokens("dark");

    // No retheme: the brand scale value itself is untouched.
    expect(rgbaToHex(parseColor(light["--accent-700"]))).toBe("#98c447");
    expect(rgbaToHex(parseColor(light["--accent-text"]))).not.toBe(
      rgbaToHex(parseColor(light["--accent-700"])),
    );
    expect(rgbaToHex(parseColor(dark["--accent-text"]))).toBe(
      rgbaToHex(parseColor(dark["--accent-700"])),
    );
  });

  it("sweeps every accent-700 text site to the semantic token", () => {
    const offenders = COMPONENT_SOURCES.filter((file) =>
      readFileSync(path.join(ROOT, file), "utf8").includes("text-accent-700"),
    );

    expect(offenders).toEqual([]);
  });

  it("rejects the lime the touched links used to shift to on hover", () => {
    const light = themeTokens("light");
    const lime = contrast(light["--accent-600"], light["--background"]);

    // #beeb6b on the sage canvas is 1.30:1 — worse than the 1.93:1 defect
    // this ticket fixed. Hover keeps the resting token, which clears AA.
    expect(lime).toBeLessThan(3);
    expect(
      contrast(light["--accent-text"], light["--background"]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps accent-link hover off the low-contrast lime", () => {
    // The touched product links signal hover with arrow motion instead of a
    // colour shift, so no `hover:text-accent-600` may reappear.
    const offenders = COMPONENT_SOURCES.filter((file) =>
      readFileSync(path.join(ROOT, file), "utf8").includes(
        "hover:text-accent-600",
      ),
    );

    expect(offenders).toEqual([]);
  });
});
