import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
 
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

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
