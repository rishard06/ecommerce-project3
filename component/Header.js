"use client";

import React, { useState } from "react";
import MeshGradientBackground from "./MeshGradientBackground";
import NavBar from "./NavBar";
import Hero from "./Hero.js";
import Category from "./Category";

export default function Header({ session }) {
  return (
    <header className="flex-col  justify-center items-center">
      <MeshGradientBackground />
      <NavBar session={session} />
      <Hero session={session} />
      <Category />
    </header>
  );
}
