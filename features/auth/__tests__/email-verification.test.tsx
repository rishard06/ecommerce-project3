// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    sendVerificationEmail: mocks.sendVerificationEmail,
  },
}));

import { sendVerificationEmail } from "@/lib/auth";
import { ResendVerificationButton } from "../components/ResendVerificationButton";

const VERIFY_URL = "http://localhost:3000/api/auth/verify-email?token=verify-token-123";

describe("email verification resend", () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset().mockResolvedValue({ id: "email-1" });
    mocks.sendVerificationEmail.mockReset().mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("unverified_triggers_verification_email_via_sendEmail", async () => {
    await sendVerificationEmail({
      user: { email: "ada@example.com" },
      url: VERIFY_URL,
    });

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ada@example.com" }),
    );
  });

  it("verification_email_embeds_link_without_leaking_secrets", async () => {
    await sendVerificationEmail({
      user: { email: "ada@example.com" },
      url: VERIFY_URL,
    });

    const payload = mocks.sendEmail.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["html", "subject", "to"]);
    expect(payload.html as string).toContain(VERIFY_URL);
    expect(JSON.stringify(payload)).not.toContain("correct-horse-battery");
  });

  it("resend_button_triggers_verification_for_unverified", async () => {
    render(
      createElement(ResendVerificationButton, {
        email: "ada@example.com",
        emailVerified: false,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      expect(mocks.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com" }),
    );
  });

  it("verified_does_not_render_resend_or_trigger", () => {
    const { container } = render(
      createElement(ResendVerificationButton, {
        email: "ada@example.com",
        emailVerified: true,
      }),
    );

    expect(container.textContent ?? "").not.toMatch(/resend/i);
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
