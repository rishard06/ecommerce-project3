"use client";
import { signIn, authClient, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignIn({ session }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.refresh(); // Refresh server components without full page reload
  };

  return (
    <>
      {session?.user ? (
        <button className="hover:cursor-pointer" onClick={handleSignOut}>
          Sign Out
        </button>
      ) : (
        <button
          className="hover:cursor-pointer"
          onClick={async () => await signIn.social({ provider: "github" })}
        >
          Sign In
        </button>
      )}
    </>
  );
}
