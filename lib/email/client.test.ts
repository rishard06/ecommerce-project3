import { describe, expect, it, vi, afterEach } from "vitest";
import { sendEmail } from "./client";

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends_via_resend_when_key_present", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "shop@example.com");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "email-123" }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await sendEmail({
      to: "a@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });

    expect(result.id).toBe("email-123");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Assert passthrough: exact URL, Bearer auth, and subject/html/from/to body.
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer re_test_key",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      from: "shop@example.com",
      to: "a@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
  });

  it("rejects_empty_recipient", async () => {
    await expect(
      sendEmail({ to: "  ", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrowError(/recipient/i);
  });

  it("rejects_empty_subject", async () => {
    await expect(
      sendEmail({ to: "a@example.com", subject: " ", html: "<p>Hi</p>" }),
    ).rejects.toThrowError(/subject/i);
  });

  it("rejects_empty_body", async () => {
    await expect(
      sendEmail({ to: "a@example.com", subject: "Hi", html: "  " }),
    ).rejects.toThrowError(/body/i);
  });

  it("dev_fallback_without_key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendEmail({
      to: "a@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result.id).toMatch(/^dev-/);
  });

  it("treats_empty_email_from_as_absent_at_consumer_level", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "email-123" }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await sendEmail({
      to: "a@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(init.body as string).from).toBe(
      "venn. <orders@example.com>",
    );
  });
});
