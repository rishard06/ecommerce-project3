// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  signUpEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  signUp: { email: mocks.signUpEmail },
}));

import RegisterForm from "../components/RegisterForm";

function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText("Name"), {
    target: { value: "Ada Lovelace" },
  });
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password (8+ chars)"), {
    target: { value: "correct-horse-battery" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("RegisterForm", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.signUpEmail.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("sends a successfully registered user to /account", async () => {
    mocks.signUpEmail.mockResolvedValue({
      data: { token: "session-token", user: { id: "user-1" } },
      error: null,
    });

    render(createElement(RegisterForm));
    fillValidForm();

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/account");
    });

    expect(mocks.signUpEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct-horse-battery",
      name: "Ada Lovelace",
      callbackURL: "/account",
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the Better Auth error and does not navigate on failure", async () => {
    mocks.signUpEmail.mockResolvedValue({
      data: null,
      error: {
        code: "USER_ALREADY_EXISTS",
        message: "User already exists",
        status: 422,
      },
    });

    render(createElement(RegisterForm));
    fillValidForm();

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "User already exists",
      );
    });

    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("uses a fallback message when the API error has no message", async () => {
    mocks.signUpEmail.mockResolvedValue({
      data: null,
      error: { code: "UNKNOWN" },
    });

    render(createElement(RegisterForm));
    fillValidForm();

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Registration failed. Please try again.",
      );
    });

    expect(mocks.push).not.toHaveBeenCalled();
  });
});
