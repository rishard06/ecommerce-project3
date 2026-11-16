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

export default function MeshGradientBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <MeshGradient
        speed={prefersReducedMotion ? 0 : 0.35}
        colors={["#dbeae6", "#8fcdb3", "#a8d6b8", "#8cc4b6"]}
        className="absolute inset-0 size-full opacity-55 mix-blend-normal"
      />

      <MeshGradient
        speed={prefersReducedMotion ? 0 : 0.35}
        colors={["#cfe3e6", "#7fc3a4", "#a5d2b4", "#7bbcab", "#3f8a6d"]}
        distortion={0.85}
        className="absolute inset-0 size-full opacity-30 mix-blend-multiply"
      />

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
