// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  push: vi.fn(),
  tokenParam: "single-use-token-123" as string | null,
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: mocks.requestPasswordReset,
    resetPassword: mocks.resetPassword,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.tokenParam ? `token=${mocks.tokenParam}` : ""),
}));

import { sendPasswordResetEmail } from "@/lib/auth";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

const RESET_URL =
  "http://localhost:3000/reset-password?token=single-use-token-123";

describe("password reset", () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset().mockResolvedValue({ id: "email-1" });
    mocks.requestPasswordReset.mockReset().mockResolvedValue({ data: {}, error: null });
    mocks.resetPassword.mockReset().mockResolvedValue({ data: {}, error: null });
    mocks.push.mockReset();
    mocks.tokenParam = "single-use-token-123";
  });

  afterEach(() => {
    cleanup();
  });

  it("sendResetPassword_sends_email_via_sendEmail", async () => {
    await sendPasswordResetEmail({
      user: { email: "ada@example.com" },
      url: RESET_URL,
    });

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ada@example.com" }),
    );
  });

  it("reset_email_embeds_link_without_leaking_secrets", async () => {
    await sendPasswordResetEmail({
      user: { email: "ada@example.com" },
      url: RESET_URL,
    });

    const payload = mocks.sendEmail.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["html", "subject", "to"]);
    expect(payload.html as string).toContain(RESET_URL);
    expect(JSON.stringify(payload)).not.toContain("correct-horse-battery");
  });

  it("forgot_form_requests_reset_link_for_email", async () => {
    render(createElement(ForgotPasswordForm));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(mocks.requestPasswordReset).toHaveBeenCalledTimes(1);
    });
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith({
      email: "ada@example.com",
      redirectTo: "/reset-password",
    });
    expect(
      screen.getByText("Check your email for a reset link."),
    ).toBeDefined();
  });

  it("reset_form_consumes_token_single_use_and_redirects_to_login", async () => {
    render(createElement(ResetPasswordForm));
    fireEvent.change(screen.getByPlaceholderText("New password (8+ chars)"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(mocks.resetPassword).toHaveBeenCalledTimes(1);
    });
    expect(mocks.resetPassword).toHaveBeenCalledWith({
      newPassword: "new-secure-password",
      token: "single-use-token-123",
    });
    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/login");
    });
  });

  it("reset_form_rejects_missing_token_without_calling_api", async () => {
    mocks.tokenParam = null;

    render(createElement(ResetPasswordForm));
    fireEvent.change(screen.getByPlaceholderText("New password (8+ chars)"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid or expired/i),
      ).toBeDefined();
    });
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });
});
