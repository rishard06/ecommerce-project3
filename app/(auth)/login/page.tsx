import React from "react";
import LoginForm from "@/features/auth/components/LoginForm";
import MeshGradientBackground from "@/components/layout/MeshGradientBackground";

export default function LoginPage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      <MeshGradientBackground />
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full flex justify-center">
        <LoginForm />
      </div>
    </main>
  );
}
