// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInEmail: vi.fn(),
  signInSocial: vi.fn(),
  nextParam: null as string | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () =>
    new URLSearchParams(
      mocks.nextParam === null
        ? ""
        : `next=${encodeURIComponent(mocks.nextParam)}`,
    ),
}));

vi.mock("@/lib/auth-client", () => ({
  signIn: {
    email: mocks.signInEmail,
    social: mocks.signInSocial,
  },
}));

vi.mock("motion/react", () => ({
  motion: new Proxy(
    {},
    {
      get: () => (props: { children?: ReactNode }) => props.children,
    },
  ),
  useReducedMotion: () => true,
}));

import LoginForm from "../components/LoginForm";

function submitCredentials() {
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "correct-horse-battery" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm next redirect", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.refresh.mockReset();
    mocks.signInEmail.mockReset();
    mocks.signInSocial.mockReset();
    mocks.nextParam = null;
    mocks.signInEmail.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("preserves a same-origin next path for callbackURL and navigation", async () => {
    mocks.nextParam = "/account/orders?tab=all";

    render(createElement(LoginForm));
    submitCredentials();

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/account/orders?tab=all");
    });
    expect(mocks.signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackURL: "/account/orders?tab=all",
      }),
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "javascript:alert(document.cookie)",
  ])(
    "sanitizes %s to / for callbackURL and navigation",
    async (maliciousNext) => {
      mocks.nextParam = maliciousNext;

      render(createElement(LoginForm));
      submitCredentials();

      await waitFor(() => {
        expect(mocks.push).toHaveBeenCalledWith("/");
      });
      expect(mocks.signInEmail).toHaveBeenCalledWith(
        expect.objectContaining({ callbackURL: "/" }),
      );
      expect(mocks.push).not.toHaveBeenCalledWith(maliciousNext);
    },
  );

  it("sanitizes next before passing it to the GitHub callbackURL", async () => {
    mocks.nextParam = "//evil.example/steal";
    mocks.signInSocial.mockResolvedValue({ data: {}, error: null });

    render(createElement(LoginForm));
    fireEvent.click(screen.getByRole("button", { name: "Sign in with GitHub" }));

    await waitFor(() => {
      expect(mocks.signInSocial).toHaveBeenCalledWith({
        provider: "github",
        callbackURL: "/",
      });
    });
  });
});
