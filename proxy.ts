import { auth } from "@/lib/auth/server";

// Next.js 16: proxy.ts replaces middleware.ts. Protect the app; leave auth
// pages and the auth API public.
export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)",
  ],
};
