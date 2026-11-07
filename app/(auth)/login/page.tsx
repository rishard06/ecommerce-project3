import React from "react";
import { Metadata } from "next";
import LoginForm from "@/features/auth/components/LoginForm";
import MeshGradientBackground from "@/components/layout/MeshGradientBackground";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your venn. account to continue shopping.",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4">
      <MeshGradientBackground />

      <div className="relative z-10 flex w-full justify-center">
        <LoginForm />
      </div>
    </main>
  );
}
