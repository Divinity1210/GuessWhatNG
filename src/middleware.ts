import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge Middleware with fast timeout & non-blocking fallback:
 * - Never blocks public pages (/, /how-to-play, /leaderboard, /login, /sign-up)
 * - Only contacts Supabase if an `sb-*` auth cookie is present, with a strict 1.5s timeout
 * - Prevents Vercel 504 MIDDLEWARE_INVOCATION_TIMEOUT if the Supabase project is paused or slow
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Fast-path public & static routes without any network call
  const publicPaths = ["/", "/how-to-play", "/leaderboard", "/auth/callback"];
  if (publicPaths.includes(pathname)) {
    return supabaseResponse;
  }

  // Check if the user has a local demo session cookie or a Supabase auth cookie
  const allCookies = request.cookies.getAll();
  const hasDemoCookie = allCookies.some((c) => c.name === "gw_demo_session" && c.value === "1");
  const hasSupabaseCookie = allCookies.some((c) => c.name.startsWith("sb-"));

  // If no Supabase cookie is present, skip the network call entirely
  if (!hasSupabaseCookie) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
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

    const authPaths = ["/login", "/sign-up"];
    if (authPaths.includes(pathname) && (user || hasDemoCookie)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } catch {
    // If Supabase is paused or unreachable, never throw 504 — let the request proceed
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
