import { cache } from "react";
import { redirect } from "next/navigation";
import {
  getSession,
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";

/**
 * Presentation fields from the memoized per-request session.
 *
 * Goes through the shared `getSession` helper so the account layout and the
 * account page — which both call `requireAccountSession` in one request —
 * share a single Better Auth lookup instead of each paying for their own.
 */
export const getAccountSession = cache(async () => {
  return getSession();
});

/**
 * Server-side gate for the account area.
 *
 * Authorization goes through the DB-backed `requireUser` guard (the same guard
 * every account mutation uses), so the role and user id cannot come from a
 * client-supplied value. The Better Auth session is only read afterwards to
 * supply presentation fields (display name, avatar, email verification).
 */
export async function requireAccountSession(nextPath = "/account") {
  // Kick off the authorization guard without awaiting: it shares the memoized
  // session with `getAccountSession`, so both run concurrently on one lookup
  // instead of sequentially (guard round-trip, then session round-trip).
  const userPromise = requireUser().catch((error: unknown) => {
    if (error instanceof UnauthorizedError) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
    throw error;
  });

  const [user, session] = await Promise.all([userPromise, getAccountSession()]);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: session?.user?.name ?? user.email,
      image: session?.user?.image ?? null,
      emailVerified: session?.user?.emailVerified ?? false,
    },
  };
}
