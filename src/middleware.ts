import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/dashboard",
  "/play",
  "/profile",
  "/wallet",
  "/rewards",
  "/referrals",
  "/inbox",
  "/community",
  "/settings",
  "/sessions",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function buildPublicUrl(request: NextRequest, pathname: string, search?: string): URL {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (forwardedHost) {
    return new URL(`${pathname}${search || ""}`, `${forwardedProto}://${forwardedHost}`);
  }
  const url = new URL(pathname, request.url);
  url.search = search || "";
  return url;
}

/**
 * Edge Middleware:
 * - Never blocks public pages (/, /how-to-play, /leaderboard, /support, /privacy, /terms, /offline)
 * - Redirects unauthenticated visitors/PWA launches on protected routes directly to /sign-up
 * - Redirects already signed-in users away from /login and /sign-up to /dashboard
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const publicPaths = [
    "/",
    "/how-to-play",
    "/leaderboard",
    "/support",
    "/privacy",
    "/terms",
    "/offline",
    "/auth/callback",
  ];
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/receipt/")
  ) {
    return supabaseResponse;
  }

  const protectedRoute = isProtectedPath(pathname);
  const authPaths = ["/login", "/sign-up"];
  const isAuthPage = authPaths.includes(pathname);

  const allCookies = request.cookies.getAll();
  const hasSupabaseCookie = allCookies.some((c) => c.name.startsWith("sb-"));

  // Fresh PWA launch or unauthenticated browser hitting a protected page -> /sign-up immediately
  if (!hasSupabaseCookie) {
    if (protectedRoute) {
      return NextResponse.redirect(buildPublicUrl(request, "/sign-up"));
    }
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (protectedRoute) {
      return NextResponse.redirect(buildPublicUrl(request, "/sign-up"));
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: async (input, init) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1500);
          try {
            return await fetch(input, { ...init, signal: controller.signal });
          } finally {
            clearTimeout(timer);
          }
        },
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (protectedRoute && !user) {
      return NextResponse.redirect(buildPublicUrl(request, "/sign-up"));
    }

    if (isAuthPage && user) {
      return NextResponse.redirect(buildPublicUrl(request, "/dashboard"));
    }
  } catch {
    if (protectedRoute) {
      return NextResponse.redirect(buildPublicUrl(request, "/sign-up"));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
