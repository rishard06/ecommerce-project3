import { z } from "zod";

/**
 * Server-only environment.
 *
 * `getServerEnv()` must only be imported from server code. Secrets are never
 * part of the public schema and validation errors list variable names only.
 */
export interface ServerEnv {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  /** Shared bearer secret that authenticates Vercel Cron requests. */
  CRON_SECRET: string;
}

/**
 * Values that are safe to expose to the browser.
 */
export interface PublicEnv {
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

const requiredString = z.string().trim().min(1);
const optionalString = z.string().trim().min(1).optional();
const requiredUrl = z.string().trim().url();
const optionalUrl = z.string().trim().url().optional();

const serverEnvSchema: z.ZodType<ServerEnv> = z.object({
  // Prisma connection strings are not required to be http(s) URLs.
  DATABASE_URL: requiredString,
  BETTER_AUTH_SECRET: requiredString,
  BETTER_AUTH_URL: requiredUrl,
  GITHUB_CLIENT_ID: requiredString,
  GITHUB_CLIENT_SECRET: requiredString,
  STRIPE_SECRET_KEY: requiredString,
  STRIPE_WEBHOOK_SECRET: requiredString,
  CRON_SECRET: requiredString,
});

const publicEnvSchema: z.ZodType<PublicEnv> = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,
  NEXT_PUBLIC_APP_URL: optionalUrl,
});

function formatValidationError(scope: "server" | "public", error: z.ZodError): string {
  const names = Array.from(
    new Set(error.issues.map((issue) => String(issue.path[0] ?? "unknown"))),
  );

  return `Missing or invalid ${scope} environment variables: ${names.join(", ")}`;
}

/**
 * Pure server-environment parser. Accepts an explicit record so tests never
 * need to mutate `process.env`, and reports only variable names on failure.
 */
export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(input);

  if (!result.success) {
    throw new Error(formatValidationError("server", result.error));
  }

  return result.data;
}

/**
 * Pure public-environment parser. Unknown keys are stripped so server secrets
 * can never leak through this schema.
 */
export function parsePublicEnv(input: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(input);

  if (!result.success) {
    throw new Error(formatValidationError("public", result.error));
  }

  return result.data;
}

/**
 * Lazily reads and validates server environment variables on each call.
 * Importing this module performs no validation and reads no secrets.
 */
export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

/**
 * Lazily reads and validates public environment variables on each call.
 */
export function getPublicEnv(): PublicEnv {
  return parsePublicEnv(process.env);
}
