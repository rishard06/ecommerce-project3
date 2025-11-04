"use client";

import React, { useState } from "react";
import MeshGradientBackground from "./MeshGradientBackground";
import NavBar from "./NavBar";
import Hero from "./Hero.js";
import Category from "./Category";
import Features from "./Features";
import Testimonies from "./Testimonies";
import FeatureProducts from "./FeatureProducts";

export default function Header({ session }) {
  return (
    <header className="flex-col  justify-center items-center">
      <MeshGradientBackground />
      <NavBar session={session} />
      <Hero session={session} />
      <Category />
      <FeatureProducts />
      <Features />
      <Testimonies />
    </header>
  );
}
