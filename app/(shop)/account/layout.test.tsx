// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Account layout streams shell-first: the section frame and children must
 * paint while the session (DB-backed guard) is still pending. The greeting
 * and the user nav wait behind their own skeletons.
 *
 * jsdom note: nested async Server Components cannot resolve in a client
 * renderer, so this test pins the shell-first contract. Guard behavior
 * (redirect for anonymous) stays covered by require-session.test.ts.
 */

const mocks = vi.hoisted(() => ({
  requireAccountSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/features/account/require-session", () => ({
  requireAccountSession: mocks.requireAccountSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  usePathname: () => "/account",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AccountLayout from "./layout";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AccountLayout streaming", () => {
  it("paints the shell and children before the session resolves", async () => {
    const session = deferred<unknown>();
    mocks.requireAccountSession.mockReturnValue(session.promise);

    // Resolves without the session: no top-level await blocks the shell.
    const ui = await AccountLayout({
      children: <div data-testid="account-child" />,
    });
    render(ui);

    expect(screen.getByTestId("account-child")).toBeInTheDocument();
    expect(screen.getByText("Your account")).toBeInTheDocument();
    expect(screen.getByText("Loading account header…")).toBeInTheDocument();
    expect(
      screen.getByText("Loading account navigation…"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Hello,/)).not.toBeInTheDocument();
    // Both suspended islands attempted their (still pending) guard lookup.
    expect(mocks.requireAccountSession).toHaveBeenCalledWith("/account");
  });
});
