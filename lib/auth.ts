import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sendEmail } from "./email/client";
import {
  passwordResetHtml,
  verificationHtml,
} from "./email/templates";

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const appUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

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
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: verificationHtml(url),
      });
    },
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
