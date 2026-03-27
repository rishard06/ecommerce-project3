"use client";

import React from "react";
import MeshGradientBackground from "./MeshGradientBackground";
import Hero from "@/components/marketing/Hero";

export default function Header() {
  return (
    <header className="flex-col  justify-center items-center">
      <MeshGradientBackground />
      <Hero />
    </header>
  );
}
