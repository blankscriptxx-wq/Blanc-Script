import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

// Next.js 16: proxy.ts replaces middleware.ts.
//
// One deployment serves two surfaces:
//   - the marketing site (public) on blancscript.com
//   - the OS (signed-in) on studio.blancscript.com
// On any other host (previews, localhost) both are reachable so they can be
// tested side by side.
const SITE_HOSTS = new Set(["blancscript.com", "www.blancscript.com"]);
const STUDIO_HOST = "studio.blancscript.com";

// Public marketing routes. Everything else belongs to the OS.
const SITE_PREFIXES = [
  "/about",
  "/contact",
  "/portfolio",
  "/services",
  "/privacy-policy",
  "/terms",
];

function isSitePath(pathname: string): boolean {
  if (pathname === "/") return true;
  // Next adds a hash suffix to the generated Open Graph image route.
  if (pathname.startsWith("/opengraph-image")) return true;
  return SITE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// OS route roots. Only used on the marketing domain, to tell "this is an OS
// link, send it to the studio" apart from "this page doesn't exist".
const OS_PREFIXES = [
  "/today", "/insights", "/clients", "/projects", "/shoots", "/edits",
  "/content", "/inbox", "/finance", "/team", "/talent", "/settings",
  "/uploads", "/auth", "/api",
];

function isOsPath(pathname: string): boolean {
  return OS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// OS routes that must stay reachable while signed out.
function isPublicOsPath(pathname: string): boolean {
  return pathname.startsWith("/auth") || pathname.startsWith("/api/auth");
}

type Mw = (req: NextRequest, ...rest: unknown[]) => Promise<Response> | Response;
let mw: Mw | undefined;

export default function proxy(req: NextRequest, ...rest: unknown[]) {
  const { pathname, search } = req.nextUrl;
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const sitePath = isSitePath(pathname);

  if (host === STUDIO_HOST && sitePath) {
    // The studio domain is the OS only.
    return NextResponse.redirect(new URL("/today", req.url));
  }
  if (SITE_HOSTS.has(host) && !sitePath) {
    // The marketing domain never serves the OS: OS links go to the studio,
    // anything else is a plain 404 (rewritten to a path no route matches).
    if (isOsPath(pathname)) {
      return NextResponse.redirect(`https://${STUDIO_HOST}${pathname}${search}`);
    }
    return NextResponse.rewrite(new URL("/_not-found-on-site", req.url));
  }
  if (sitePath || isPublicOsPath(pathname)) {
    return NextResponse.next();
  }

  // Auth is created lazily at request time.
  mw ??= getAuth().middleware({ loginUrl: "/auth/sign-in" }) as unknown as Mw;
  return mw(req, ...rest);
}

export const config = {
  // Skip Next internals and anything with a file extension (static assets,
  // robots.txt, sitemap.xml, manifests).
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
