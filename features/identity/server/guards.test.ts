import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  getCurrentUser,
  requireAdmin,
  requireUser,
  UnauthorizedError,
} from "./guards";

const getSession = vi.mocked(auth.api.getSession);
const findUser = vi.mocked(prisma.user.findUnique);

interface FixtureUser {
  id: string;
  email: string;
}

function dbUser(user: FixtureUser, role: "CUSTOMER" | "ADMIN") {
  return {
    id: user.id,
    name: "Test User",
    email: user.email,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role,
  };
}

function authSession(user: FixtureUser) {
  return {
    session: {
      id: "session-1",
      userId: user.id,
      token: "token",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
    user: {
      id: user.id,
      name: "Test User",
      email: user.email,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

const CUSTOMER = { id: "user-1", email: "customer@example.com" };
const ADMIN = { id: "admin-1", email: "admin@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUser", () => {
  it("returns null when there is no session", async () => {
    getSession.mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUser).not.toHaveBeenCalled();
  });

  it("returns null when the session user is missing from the database", async () => {
    getSession.mockResolvedValue(authSession(CUSTOMER) as never);
    findUser.mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("loads the role from the database, never from the client session", async () => {
    getSession.mockResolvedValue(authSession(CUSTOMER) as never);
    findUser.mockResolvedValue(dbUser(CUSTOMER, "CUSTOMER") as never);

    const user = await getCurrentUser();

    expect(findUser).toHaveBeenCalledWith({
      where: { id: CUSTOMER.id },
      select: { id: true, email: true, role: true },
    });
    expect(user).toEqual({
      id: CUSTOMER.id,
      email: CUSTOMER.email,
      role: "CUSTOMER",
    });
  });
});

describe("requireUser", () => {
  it("rejects with UnauthorizedError when there is no session", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(findUser).not.toHaveBeenCalled();
  });

  it("rejects with UnauthorizedError when the database user is missing", async () => {
    getSession.mockResolvedValue(authSession(CUSTOMER) as never);
    findUser.mockResolvedValue(null);

    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("resolves for a CUSTOMER", async () => {
    getSession.mockResolvedValue(authSession(CUSTOMER) as never);
    findUser.mockResolvedValue(dbUser(CUSTOMER, "CUSTOMER") as never);

    await expect(requireUser()).resolves.toEqual({
      id: CUSTOMER.id,
      email: CUSTOMER.email,
      role: "CUSTOMER",
    });
  });
});

describe("requireAdmin", () => {
  it("rejects with UnauthorizedError when there is no session", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects with ForbiddenError for a CUSTOMER even if the session claims ADMIN", async () => {
    // A tampered client session claims admin; the DB record says CUSTOMER.
    getSession.mockResolvedValue(
      authSession(ADMIN) as never,
    );
    findUser.mockResolvedValue(dbUser(ADMIN, "CUSTOMER") as never);

    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("resolves for an ADMIN", async () => {
    getSession.mockResolvedValue(authSession(ADMIN) as never);
    findUser.mockResolvedValue(dbUser(ADMIN, "ADMIN") as never);

    await expect(requireAdmin()).resolves.toEqual({
      id: ADMIN.id,
      email: ADMIN.email,
      role: "ADMIN",
    });
  });
});
