import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/app/generated/prisma";

/**
 * Ticket #10 — brute-force protection for Better Auth credential endpoints.
 *
 * Better Auth keys its built-in limiter by IP + path (see
 * `node_modules/better-auth/dist/api/rate-limiter/index.mjs`). The production
 * config therefore uses generous per-IP budgets on the credential paths so a
 * NAT full of legitimate users is not locked out, while a single IP hammering
 * one account is cut off with 429 + a retry hint.
 *
 * These tests run against the disposable PostgreSQL test database (same
 * fail-closed pattern as the order suites): `DATABASE_URL_TEST` must be set
 * and must differ from `DATABASE_URL`. Test traffic uses reserved TEST-NET-3
 * source IPs so rate-limit rows never collide with other suites.
 */

function loadTestDatabaseUrl(): string {
  try {
    process.loadEnvFile?.(".env");
  } catch {
    // `.env` is optional; the test URL may be provided by the shell.
  }

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error(
      "DATABASE_URL_TEST must be set to the disposable test database URL.",
    );
  }
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error(
      "Refusing to run database tests: DATABASE_URL_TEST matches DATABASE_URL.",
    );
  }
  return testUrl;
}

const testDatabaseUrl = loadTestDatabaseUrl();
// Point the application singletons at the disposable database before the auth
// module (and therefore `lib/prisma`) is imported below.
process.env.DATABASE_URL = testDatabaseUrl;

const testPrisma = new PrismaClient({ datasourceUrl: testDatabaseUrl });

const { auth, authRateLimit } = await import("@/lib/auth");

const BASE_URL = "http://localhost:3000";
const RUN_ID = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const LEGIT_PASSWORD = "CorrectHorseBatter1!";
const LEGIT_EMAIL = `throttle-legit-${RUN_ID}@example.com`;
const BRUTE_IP = "203.0.113.10";
const LEGIT_IP = "203.0.113.20";

function authRequest(
  path: string,
  body: unknown,
  ip: string,
): Promise<Response> {
  return auth.handler(
    new Request(`${BASE_URL}/api/auth${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    }),
  );
}

function retryAfterOf(res: Response): string | null {
  return res.headers.get("X-Retry-After") ?? res.headers.get("Retry-After");
}

afterAll(async () => {
  await testPrisma.rateLimit.deleteMany({
    where: { OR: [{ key: { startsWith: BRUTE_IP } }, { key: { startsWith: LEGIT_IP } }] },
  });
  await testPrisma.user.deleteMany({
    where: { email: { endsWith: `${RUN_ID}@example.com` } },
  });
  await testPrisma.$disconnect();
});

describe("auth rate-limit configuration", () => {
  it("enables DB-backed throttling with generous credential caps", () => {
    expect(authRateLimit.enabled).toBe(true);
    expect(authRateLimit.storage).toBe("database");
    expect(authRateLimit.window).toBe(10);
    expect(authRateLimit.max).toBe(100);
    expect(authRateLimit.customRules["/sign-in/*"]).toMatchObject({
      window: 60,
      max: 30,
    });
    expect(authRateLimit.customRules["/sign-up/*"]).toMatchObject({
      window: 60,
      max: 30,
    });
  });
});

describe("auth brute-force throttle", () => {
  it(
    "blocks 101 rapid bad-password attempts from one IP with 429 + retry hint",
    { timeout: 180_000 },
    async () => {
      await auth.api.signUpEmail({
        body: {
          name: "Throttle Target",
          email: LEGIT_EMAIL,
          password: LEGIT_PASSWORD,
        },
      });

      const statuses: number[] = [];
      let retryHint: string | null = null;
      for (let i = 0; i < 101; i++) {
        const res = await authRequest(
          "/sign-in/email",
          { email: LEGIT_EMAIL, password: "wrong-password-123" },
          BRUTE_IP,
        );
        statuses.push(res.status);
        if (res.status === 429 && retryHint === null) {
          retryHint = retryAfterOf(res);
        }
        await res.arrayBuffer();
      }

      // The first bad-password attempt reaches credential checking (401), it
      // must not be throttled.
      expect(statuses[0]).not.toBe(429);
      // The flood is cut off well before the 101st attempt and stays cut off.
      expect(statuses[100]).toBe(429);
      expect(statuses.slice(30).every((s) => s === 429)).toBe(true);
      // The client gets a retry hint so it can back off.
      expect(retryHint).not.toBeNull();
      expect(Number(retryHint)).toBeGreaterThan(0);
    },
  );

  it(
    "leaves legitimate signup + login unaffected on a different IP",
    { timeout: 60_000 },
    async () => {
      const email = `throttle-fresh-${RUN_ID}@example.com`;
      const signup = await authRequest(
        "/sign-up/email",
        { name: "Throttle Fresh", email, password: LEGIT_PASSWORD },
        LEGIT_IP,
      );
      await signup.arrayBuffer();
      expect(signup.status).toBe(200);

      const login = await authRequest(
        "/sign-in/email",
        { email, password: LEGIT_PASSWORD },
        LEGIT_IP,
      );
      await login.arrayBuffer();
      expect(login.status).toBe(200);
      expect(login.headers.get("set-cookie")).toMatch(/session/i);
    },
  );
});
