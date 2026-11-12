import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

// Next.js 16: proxy.ts replaces middleware.ts. Protect the app; leave auth
// pages and the auth API public. Auth is created lazily at request time.
type Mw = (req: NextRequest, ...rest: unknown[]) => Promise<Response> | Response;
let mw: Mw | undefined;

export default function proxy(req: NextRequest, ...rest: unknown[]) {
  mw ??= getAuth().middleware({ loginUrl: "/auth/sign-in" }) as unknown as Mw;
  return mw(req, ...rest);
}

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)",
  ],
};
