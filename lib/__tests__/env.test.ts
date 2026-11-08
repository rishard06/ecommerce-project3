import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPublicEnv,
  getServerEnv,
  parsePublicEnv,
  parseServerEnv,
} from "../env";

const VALID_SERVER_ENV = {
  DATABASE_URL: "postgresql://store_user:store_password@localhost:5432/store",
  BETTER_AUTH_SECRET: "test-better-auth-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  GITHUB_CLIENT_ID: "test-github-client-id",
  GITHUB_CLIENT_SECRET: "test-github-client-secret",
  STRIPE_SECRET_KEY: "sk_test_example_secret_key",
  STRIPE_WEBHOOK_SECRET: "whsec_test_example_secret",
};

describe("parseServerEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns_validated_server_env", () => {
    const env = parseServerEnv(VALID_SERVER_ENV);

    expect(env.DATABASE_URL).toBe(VALID_SERVER_ENV.DATABASE_URL);
    expect(env.BETTER_AUTH_SECRET).toBe(VALID_SERVER_ENV.BETTER_AUTH_SECRET);
    expect(env.BETTER_AUTH_URL).toBe(VALID_SERVER_ENV.BETTER_AUTH_URL);
    expect(env.GITHUB_CLIENT_ID).toBe(VALID_SERVER_ENV.GITHUB_CLIENT_ID);
    expect(env.GITHUB_CLIENT_SECRET).toBe(VALID_SERVER_ENV.GITHUB_CLIENT_SECRET);
    expect(env.STRIPE_SECRET_KEY).toBe(VALID_SERVER_ENV.STRIPE_SECRET_KEY);
    expect(env.STRIPE_WEBHOOK_SECRET).toBe(
      VALID_SERVER_ENV.STRIPE_WEBHOOK_SECRET,
    );
  });

  it("accepts_webhook_and_optional_cron_secrets", () => {
    const env = parseServerEnv({
      ...VALID_SERVER_ENV,
      CRON_SECRET: "cron_example",
    });

    expect(env.STRIPE_WEBHOOK_SECRET).toBe(
      VALID_SERVER_ENV.STRIPE_WEBHOOK_SECRET,
    );
    expect(env.CRON_SECRET).toBe("cron_example");
  });

  it("server_env_rejects_missing_webhook_secret", () => {
    const { STRIPE_WEBHOOK_SECRET: _omitted, ...withoutWebhook } =
      VALID_SERVER_ENV;

    expect(() => parseServerEnv(withoutWebhook)).toThrowError(
      /STRIPE_WEBHOOK_SECRET/,
    );
  });

  it("server_env_rejects_missing_stripe_secret", () => {
    const withoutStripe = {
      ...VALID_SERVER_ENV,
      STRIPE_SECRET_KEY: undefined,
      GITHUB_CLIENT_SECRET: "should-never-appear-in-error",
    };

    expect(() => parseServerEnv(withoutStripe)).toThrowError(/STRIPE_SECRET_KEY/);

    try {
      parseServerEnv(withoutStripe);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("STRIPE_SECRET_KEY");
      expect(message).not.toContain("should-never-appear-in-error");
      expect(message).not.toContain(VALID_SERVER_ENV.BETTER_AUTH_SECRET);
      expect(message).not.toContain(VALID_SERVER_ENV.DATABASE_URL);
    }
  });

  it("rejects_empty_required_values", () => {
    expect(() => parseServerEnv({ ...VALID_SERVER_ENV, BETTER_AUTH_SECRET: "" })).toThrowError(
      /BETTER_AUTH_SECRET/,
    );
    expect(() => parseServerEnv({ ...VALID_SERVER_ENV, STRIPE_SECRET_KEY: "" })).toThrowError(
      /STRIPE_SECRET_KEY/,
    );
    expect(() =>
      parseServerEnv({ ...VALID_SERVER_ENV, STRIPE_WEBHOOK_SECRET: "" }),
    ).toThrowError(/STRIPE_WEBHOOK_SECRET/);
  });

  it("rejects_invalid_urls", () => {
    expect(() => parseServerEnv({ ...VALID_SERVER_ENV, BETTER_AUTH_URL: "not-a-url" })).toThrowError(
      /BETTER_AUTH_URL/,
    );
  });

  it("lists_only_variable_names_for_multiple_failures", () => {
    const invalid = {
      ...VALID_SERVER_ENV,
      BETTER_AUTH_SECRET: "",
      GITHUB_CLIENT_ID: "",
    };

    try {
      parseServerEnv(invalid);
      throw new Error("expected parseServerEnv to throw");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("BETTER_AUTH_SECRET");
      expect(message).toContain("GITHUB_CLIENT_ID");
      expect(message).not.toContain("test-github-client-id");
    }
  });
});

describe("parsePublicEnv", () => {
  it("accepts_an_empty_public_environment", () => {
    expect(parsePublicEnv({})).toEqual({});
  });

  it("returns_public_values_when_present", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });

    expect(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe("pk_test_example");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("rejects_invalid_public_app_url", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrowError(
      /NEXT_PUBLIC_APP_URL/,
    );
  });
});

describe("getServerEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads_process_env_lazily_at_call_time", () => {
    vi.stubEnv("DATABASE_URL", VALID_SERVER_ENV.DATABASE_URL);
    vi.stubEnv("BETTER_AUTH_SECRET", VALID_SERVER_ENV.BETTER_AUTH_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", VALID_SERVER_ENV.BETTER_AUTH_URL);
    vi.stubEnv("GITHUB_CLIENT_ID", VALID_SERVER_ENV.GITHUB_CLIENT_ID);
    vi.stubEnv("GITHUB_CLIENT_SECRET", VALID_SERVER_ENV.GITHUB_CLIENT_SECRET);
    vi.stubEnv("STRIPE_SECRET_KEY", VALID_SERVER_ENV.STRIPE_SECRET_KEY);
    vi.stubEnv(
      "STRIPE_WEBHOOK_SECRET",
      VALID_SERVER_ENV.STRIPE_WEBHOOK_SECRET,
    );

    expect(getServerEnv().STRIPE_SECRET_KEY).toBe(VALID_SERVER_ENV.STRIPE_SECRET_KEY);
    expect(getServerEnv().STRIPE_WEBHOOK_SECRET).toBe(
      VALID_SERVER_ENV.STRIPE_WEBHOOK_SECRET,
    );
  });
});

describe("getPublicEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads_process_env_lazily_at_call_time", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    expect(getPublicEnv().NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });
});
