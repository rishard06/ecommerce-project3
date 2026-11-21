"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="glass-component w-full max-w-md space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!token) {
          setError("This reset link is invalid or expired. Request a new one.");
          return;
        }
        setError(null);
        const res = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (res.error) {
          setError(res.error.message ?? "Unable to reset password");
        } else {
          router.push("/login");
        }
      }}
    >
      <h1 className="text-xl font-semibold">Set new password</h1>
      <input
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (8+ chars)"
        className="h-11 w-full rounded-xl border px-4 text-sm"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        className="h-11 w-full rounded-full bg-action text-sm font-semibold text-action-foreground transition-colors hover:bg-action-hover"
      >
        Reset password
      </button>
    </form>
  );
}
