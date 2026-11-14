"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="glass-component w-full max-w-md space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const res = await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        if (res.error) {
          setError(res.error.message ?? "Unable to send reset email");
        } else {
          setDone(true);
        }
      }}
    >
      <h1 className="text-xl font-semibold">Forgot password</h1>
      {done ? (
        <p className="text-sm">Check your email for a reset link.</p>
      ) : (
        <>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border px-4 text-sm"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            className="h-11 w-full rounded-full bg-gray-900 text-sm font-semibold text-white"
          >
            Send reset link
          </button>
        </>
      )}
    </form>
  );
}
