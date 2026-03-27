"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { authClient, signIn, signOut, useSession } from "../../lib/auth-client";

export default function UserAction() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="focus-visible:ring-0 focus-visible:ring-offset-0 border-2 border-white rounded-full hover:cursor-pointer"
        >
          {session?.user ? (
            <img
              src={session?.user.image || ""}
              alt="User"
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <UserIcon className="h-6 w-6" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="glass-component w-56 px-6 py-2">
        <DropdownMenuLabel className="p-0">
          {session?.user ? session.user.name : "My Account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {session?.user ? (
          <DropdownMenuItem
            onClick={async () => {
              await authClient.revokeSessions();
              await signOut();
              router.refresh();
            }}
            className="hover:cursor-pointer p-0"
          >
            Log Out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => router.push("/login")}
            className="hover:cursor-pointer p-0"
          >
            Sign In
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
