import React from "react";
import MeshGradientBackground from "./MeshGradientBackground";
import Hero from "@/components/marketing/Hero";

export default function Header() {
  return (
    <header className="relative flex flex-col items-center justify-center overflow-hidden">
      <MeshGradientBackground />
      <Hero />
    </header>
  );
}
