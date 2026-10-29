import { createBrowserClient } from "@supabase/ssr";

let supabaseOfflineUntil = 0;

/**
 * Custom fetch with a 10s timeout (15s for auth) and non-blocking fallback.
 * Auth requests (/auth/v1/) never get blocked by the data circuit breaker.
 */
async function fastSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const isAuthRequest = urlStr.includes("/auth/v1/");

  if (!isAuthRequest && Date.now() < supabaseOfflineUntil) {
    return new Response(
      JSON.stringify({ message: "Supabase offline circuit breaker active" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const controller = new AbortController();
  const timeoutMs = isAuthRequest ? 15000 : 10000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      supabaseOfflineUntil = 0;
    }
    return res;
  } catch {
    clearTimeout(timer);
    if (!isAuthRequest) {
      supabaseOfflineUntil = Date.now() + 10_000;
    }
    return new Response(
      JSON.stringify({ message: "Supabase connection timed out (offline fallback)" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(url, key, {
    global: {
      fetch: fastSupabaseFetch,
    },
  });
}
