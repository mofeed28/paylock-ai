import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

// Construct only at request time: legacy judge builds do not need account secrets.
function createAccountAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.APP_URL;
  if (!secret || secret.length < 32 || !baseURL)
    throw new Error(
      "Persistent accounts require APP_URL and BETTER_AUTH_SECRET (32+ characters)",
    );
  return betterAuth({
    appName: "Paylock",
    secret,
    baseURL,
    database: prismaAdapter(db, { provider: "sqlite" }),
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    account: { accountLinking: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    advanced: {
      useSecureCookies: baseURL.startsWith("https:"),
      // Enable only behind our Caddy proxy, which overwrites this header.
      ipAddress: {
        ipAddressHeaders:
          process.env.AUTH_TRUST_PROXY === "true" ? ["x-forwarded-for"] : [],
      },
    },
  });
}
let instance: ReturnType<typeof createAccountAuth> | undefined;
export function accountAuth() {
  return (instance ??= createAccountAuth());
}
