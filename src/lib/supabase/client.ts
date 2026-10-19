import { createBrowserClient } from "@supabase/ssr";

let supabaseOfflineUntil = 0;

/**
 * Custom fetch with a fast 2.2s timeout + 60s circuit breaker.
 * Prevents the UI from hanging when the remote Supabase free-tier project is paused or unreachable.
 */
async function fastSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (Date.now() < supabaseOfflineUntil) {
    return new Response(
      JSON.stringify({ message: "Supabase offline circuit breaker active" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2200);

  try {
    const res = await fetch(input, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    supabaseOfflineUntil = Date.now() + 60_000;
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
