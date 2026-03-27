import React from "react";
import { MeshGradient } from "@paper-design/shaders-react";

export default function MeshGradientBackground() {
  return (
    <>
      <MeshGradient
        speed={0.7}
        colors={["#c7dae1", "#61c295ba", "#98cdb1", "#73bfb0e6"]}
        className="absolute inset-0 w-full h-screen mix-blend-normal opacity-60 -z-10"
        // style={{ zIndex: -1 }}
      />

      <MeshGradient
        speed={0.7}
        colors={["#c7dae1", "#61c295ba", "#98cdb1", "#73bfb0e6", "#1f6e53"]}
        distortion={1}
        className="absolute inset-0 w-full h-screen mix-blend-multiply opacity-35 -z-10"
        // style={{ zIndex: -1 }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#9ee9dc] via-transparent to-white-200-900/0 -z-1"></div>
    </>
  );
}
