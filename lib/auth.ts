import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sendEmail } from "./email/client";
import {
  passwordResetHtml,
  verificationHtml,
} from "./email/templates";

import { getServerEnv } from "./env";

/**
 * Resolves auth env through the validated server schema so `""` → absent
 * normalization applies at runtime. Falls back to normalized raw reads when
 * the full schema is not satisfied (tests, partial envs), preserving the
 * existing semantics: GitHub disabled unless both id + secret are present,
 * app URL chain BETTER_AUTH_URL → NEXT_PUBLIC_APP_URL → localhost.
 */
function resolveAuthEnv(): {
  githubClientId: string | undefined;
  githubClientSecret: string | undefined;
  appUrl: string;
} {
  try {
    const env = getServerEnv();
    return {
      githubClientId: env.GITHUB_CLIENT_ID,
      githubClientSecret: env.GITHUB_CLIENT_SECRET,
      appUrl: env.BETTER_AUTH_URL,
    };
  } catch {
    const absent = (v: string | undefined) => (v === "" ? undefined : v);
    return {
      githubClientId: absent(process.env.GITHUB_CLIENT_ID),
      githubClientSecret: absent(process.env.GITHUB_CLIENT_SECRET),
      appUrl:
        absent(process.env.BETTER_AUTH_URL) ??
        absent(process.env.NEXT_PUBLIC_APP_URL) ??
        "http://localhost:3000",
    };
  }
}

const { githubClientId, githubClientSecret, appUrl } = resolveAuthEnv();

export async function sendPasswordResetEmail({
  user,
  url,
}: {
  user: { email: string };
  url: string;
}): Promise<void> {
  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: passwordResetHtml(url),
  });
}

export async function sendVerificationEmail({
  user,
  url,
}: {
  user: { email: string };
  url: string;
}): Promise<void> {
  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    html: verificationHtml(url),
  });
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Auto sign-in is Better Auth's default for email/password. It is set
    // explicitly here so the registration flow (which routes straight to
    // /account) and this configuration cannot drift apart. Do not move this
    // option to the top level: Better Auth only reads it under
    // `emailAndPassword`.
    autoSignIn: true,
    sendResetPassword: sendPasswordResetEmail,
  },
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: sendVerificationEmail,
  },
  ...(githubClientId && githubClientSecret
    ? {
        socialProviders: {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
            prompt: "select_account",
          },
        },
      }
    : {}),
});

export function getAuthUrl(path: string): string {
  return `${appUrl.replace(/\/$/, "")}${path}`;
}
