import { cache } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type UserRole = "CUSTOMER" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Thrown when there is no valid session. Maps to HTTP 401.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when an authenticated user lacks the required role. Maps to HTTP 403.
 */
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

/**
 * Single per-request memoized Better Auth session lookup.
 *
 * Layouts and pages both guard the same route (e.g. AccountLayout plus the
 * account page, AdminLayout plus each admin page), so without memoization
 * every navigation pays for the session query twice — plus a second DB user
 * lookup. `cache()` deduplicates all of these to one lookup per request.
 * Every session consumer in the app must go through this helper (directly or
 * via `getCurrentUser`) to share the memoized result.
 */
export const getSession = cache(async () => {
  // Request-bound by design: the session comes from request headers and
  // Better Auth's expiry checks read the current time. Under Cache
  // Components this must be declared with `connection()` — otherwise the
  // prerender hits blocking-prerender-current-time. Every guard funnels
  // through here, so one declaration covers all authenticated routes.
  await connection();
  return auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Resolves the Better Auth session, then loads the role exclusively from
 * PostgreSQL. A client can never assert its own role or user id.
 *
 * Memoized per request: concurrent and sequential `requireUser` /
 * `requireAdmin` / `getCurrentUser` calls in one render share a single
 * session fetch and a single user row lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();

  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true },
  });

  if (!dbUser) {
    return null;
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
  };
});

/**
 * Guard for any authenticated action. Throws UnauthorizedError when there is
 * no valid session.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

/**
 * Guard for administrative actions. Throws UnauthorizedError without a
 * session and ForbiddenError when the database role is not ADMIN.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  if (user.role !== "ADMIN") {
    throw new ForbiddenError();
  }

  return user;
}
