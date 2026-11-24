// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Account overview streams shell-first: the static shortcut cards and the
 * dashboard skeleton must paint while the session (DB-backed guard) and the
 * dashboard queries are still pending. Only the user-specific numbers wait.
 *
 * jsdom note: nested async Server Components (DashboardContent) cannot
 * resolve in a client renderer, so these tests pin the shell-first contract
 * (page returns + static content paints with the session pending). Data
 * resolution is covered by the service tests and the production build.
 */

const mocks = vi.hoisted(() => ({
  requireAccountSession: vi.fn(),
  listOrdersForUser: vi.fn(),
  listAddresses: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/features/account/require-session", () => ({
  requireAccountSession: mocks.requireAccountSession,
}));

vi.mock("@/features/orders/server/customer-order-service", () => ({
  listOrdersForUser: mocks.listOrdersForUser,
}));

vi.mock("@/features/account/address-actions", () => ({
  listAddresses: mocks.listAddresses,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import AccountPage from "./page";

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
  mocks.listOrdersForUser.mockResolvedValue([]);
  mocks.listAddresses.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AccountPage streaming", () => {
  it("paints the static shortcut cards before the session resolves", async () => {
    const session = deferred<unknown>();
    mocks.requireAccountSession.mockReturnValue(session.promise);

    // Resolves without the session: no top-level await blocks the shell.
    const ui = await AccountPage();
    render(ui);

    expect(
      screen.getByRole("link", { name: /Edit profile/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Account settings/ }),
    ).toBeInTheDocument();
    // The dashboard streams behind its own skeleton, not a blank page.
    expect(screen.getByText("Loading dashboard…")).toBeInTheDocument();
    // The session-gated boundary attempted its (still pending) lookup.
    expect(mocks.requireAccountSession).toHaveBeenCalledTimes(1);
  });
});
