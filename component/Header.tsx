"use client";

import React, { useState } from "react";
import MeshGradientBackground from "./MeshGradientBackground";
import NavBar from "./NavBar";
import Hero from "./Hero";
import { Session } from "../types";

export default function Header({ session }: { session: Session | null }) {
  return (
    <header className="flex-col  justify-center items-center">
      <MeshGradientBackground />
      <NavBar session={session} />
      <Hero session={session} />
    </header>
  );
}
