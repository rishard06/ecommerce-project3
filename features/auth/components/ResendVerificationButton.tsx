"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResendVerificationButton({
  email,
  emailVerified,
}: {
  email: string;
  emailVerified: boolean;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (emailVerified) return null;

  if (done) {
    return <p className="text-sm">Check your email for a verification link.</p>;
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={sending}
        onClick={async () => {
          setSending(true);
          setError(null);
          const res = await authClient.sendVerificationEmail({
            email,
            callbackURL: "/account/settings",
          });
          setSending(false);
          if (res.error) {
            setError(res.error.message ?? "Unable to send verification email");
          } else {
            setDone(true);
          }
        }}
        className="inline-flex h-9 items-center rounded-full border border-gray-primary/15 bg-white/40 px-4 text-sm font-semibold text-gray-primary transition-colors hover:bg-white/70 disabled:opacity-60"
      >
        {sending ? "Sending…" : "Resend verification email"}
      </button>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
