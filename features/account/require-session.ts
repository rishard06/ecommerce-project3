import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  requireUser,
  UnauthorizedError,
} from "@/features/identity/server/guards";

export async function getAccountSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Server-side gate for the account area.
 *
 * Authorization goes through the DB-backed `requireUser` guard (the same guard
 * every account mutation uses), so the role and user id cannot come from a
 * client-supplied value. The Better Auth session is only read afterwards to
 * supply presentation fields (display name, avatar, email verification).
 */
export async function requireAccountSession(nextPath = "/account") {
  const user = await requireUser().catch((error: unknown) => {
    if (error instanceof UnauthorizedError) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
    throw error;
  });

  const session = await getAccountSession();

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
