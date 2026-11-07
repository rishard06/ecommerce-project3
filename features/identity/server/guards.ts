import { headers } from "next/headers";
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
 * Resolves the Better Auth session, then loads the role exclusively from
 * PostgreSQL. A client can never assert its own role or user id.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
}

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
