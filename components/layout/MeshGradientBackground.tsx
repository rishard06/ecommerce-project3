"use client";

import React from "react";
import { MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";

/**
 * Static fractal-noise tile for the hero grain. Inline SVG keeps the texture
 * out of the image pipeline: no extra request, no raster asset, no runtime.
 */
const GRAIN_TEXTURE = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='grain'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#grain)'/></svg>",
)}")`;

/**
 * Direction C palette comes from the theme sheet, never literals here: the
 * dark-first canvas, deep forest, mid-green, and lime accent. `color` on a
 * throwaway probe resolves `light-dark()`/`color-mix()` to an RGB string the
 * shader can parse, and keeps light-OS users on the sage palette.
 */
const MESH_TOKENS = [
  "--background",
  "--panel-2",
  "--mesh-deep",
  "--mesh-mid",
  "--mesh-lime",
] as const;

const COMPUTED_COLOR = /^(?:rgb|hsl|oklab|oklch|lab|lch|color)\(/;

function resolveToken(token: string): string {
  const declared = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (!declared) return "";

  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  probe.style.position = "absolute";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  document.body.append(probe);
  const value = getComputedStyle(probe).color.trim();
  probe.remove();
  return value;
}

function readMeshPalette(): string[] {
  const colors = MESH_TOKENS.map(resolveToken);
  return colors.every((color) => COMPUTED_COLOR.test(color)) ? colors : [];
}

export default function MeshGradientBackground() {
  const prefersReducedMotion = useReducedMotion();
  const [allowWebGL, setAllowWebGL] = React.useState(false);
  const [palette, setPalette] = React.useState<string[]>([]);

  React.useEffect(() => {
    const coarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 768px)").matches;
    setAllowWebGL(!coarse);
    setPalette(readMeshPalette());
  }, []);

  const showWebGL = allowWebGL && !prefersReducedMotion && palette.length > 0;

  return (
    // Viewport-fixed: the animation sits behind the whole page (announcement,
    // nav, content, footer). `clip` rather than `hidden` so sticky elements
    // keep their containing block.
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-clip" aria-hidden="true">
      {showWebGL && (
        <>
          <MeshGradient
            speed={0.3}
            colors={palette}
            className="absolute inset-0 size-full opacity-70 mix-blend-normal"
          />
          <MeshGradient
            speed={0.26}
            colors={[...palette].reverse()}
            distortion={0.9}
            className="absolute inset-0 size-full opacity-30 mix-blend-screen"
          />
        </>
      )}

      {/* Token-driven lime/forest glow: the visible backdrop when WebGL is
          disabled (mobile, reduced motion) and a warm accent over it when on. */}
      <div data-mesh-glow className="mesh-glow pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Static 4% film grain over the mesh: enough to read as material, low
          enough to never compete with the copy. */}
      <div
        data-grain
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: GRAIN_TEXTURE,
          backgroundRepeat: "repeat",
          backgroundSize: "160px 160px",
        }}
      />

      {/* A quiet wash at the bottom so the hero dissolves into the page. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
