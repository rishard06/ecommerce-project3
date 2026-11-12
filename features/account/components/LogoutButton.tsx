"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient, signOut } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    setIsSigningOut(true);
    await authClient.revokeSessions();
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={isSigningOut}
      className="h-11 rounded-full border-gray-primary/15 px-6 font-semibold text-gray-primary hover:bg-white/60"
    >
      {isSigningOut ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Signing out…
        </>
      ) : (
        <>
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </>
      )}
    </Button>
  );
}
