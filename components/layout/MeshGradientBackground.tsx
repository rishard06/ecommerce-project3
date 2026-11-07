"use client";

import React from "react";
import { MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";

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

      {/* A quiet wash at the bottom so the hero dissolves into the page. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
