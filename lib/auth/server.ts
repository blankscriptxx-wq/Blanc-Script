import { createNeonAuth } from "@neon/auth/next/server";

/**
 * Neon Auth (Managed Better Auth) server instance — created lazily on first use,
 * so a build never fails just because env vars aren't present at build time.
 * Needs NEON_AUTH_BASE_URL (from the Vercel–Neon integration) and
 * NEON_AUTH_COOKIE_SECRET at runtime.
 */
type NeonAuth = ReturnType<typeof createNeonAuth>;
let _auth: NeonAuth | undefined;

export function getAuth(): NeonAuth {
  if (!_auth) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret) {
      throw new Error(
        "Auth not configured: set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.",
      );
    }
    _auth = createNeonAuth({ baseUrl, cookies: { secret } });
  }
  return _auth;
}
