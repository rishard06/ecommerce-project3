import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  requireUser: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/features/identity/server/guards", () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
  requireUser: mocks.requireUser,
  // require-session reads presentation fields through the shared memoized
  // session helper, never through `@/lib/auth` directly.
  getSession: mocks.getSession,
}));

import { requireAccountSession } from "../require-session";
import { UnauthorizedError } from "@/features/identity/server/guards";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAccountSession", () => {
  it("redirects anonymous visitors to login with the requested path", async () => {
    mocks.requireUser.mockRejectedValueOnce(new UnauthorizedError());
    mocks.getSession.mockResolvedValueOnce(null);

    await expect(requireAccountSession("/account/orders")).rejects.toThrow(
      "NEXT_REDIRECT:",
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/login?next=%2Faccount%2Forders",
    );
  });

  it("returns identity from requireUser plus display fields from the session", async () => {
    mocks.requireUser.mockResolvedValueOnce({
      id: "user_1",
      email: "ada@example.com",
      role: "CUSTOMER",
    });
    mocks.getSession.mockResolvedValueOnce({
      user: {
        name: "Ada Lovelace",
        image: "https://example.com/ada.png",
        emailVerified: true,
      },
    });

    await expect(requireAccountSession()).resolves.toEqual({
      user: {
        id: "user_1",
        email: "ada@example.com",
        role: "CUSTOMER",
        name: "Ada Lovelace",
        image: "https://example.com/ada.png",
        emailVerified: true,
      },
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
