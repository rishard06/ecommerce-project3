import React from "react";
import MeshGradientBackground from "./MeshGradientBackground";
import Hero from "@/components/marketing/Hero";

export default function Header() {
  return (
    <header className="hero relative bg-background text-foreground">
      <MeshGradientBackground />
      <div className="shell">
        <Hero />
      </div>
    </header>
  );
}
