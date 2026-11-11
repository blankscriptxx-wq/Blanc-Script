import { createNeonAuth } from "@neon/auth/next/server";

/**
 * Neon Auth (Managed Better Auth) server instance.
 * Provides .handler() for the API route, .middleware() for route protection,
 * and .getSession()/.signUp/.signIn for server code.
 * Config from env (Vercel–Neon integration injects NEON_AUTH_BASE_URL).
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
