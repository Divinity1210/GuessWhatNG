import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

let serverOfflineUntil = 0;

async function fastServerSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (Date.now() < serverOfflineUntil) {
    return new Response(
      JSON.stringify({ message: "Supabase server offline circuit breaker active" }),
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
    serverOfflineUntil = Date.now() + 60_000;
    return new Response(
      JSON.stringify({ message: "Supabase server connection timed out" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(url, key, {
    global: { fetch: fastServerSupabaseFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (all) => {
        try {
          all.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // called from a Server Component; proxy refreshes sessions
        }
      },
    },
  });
}

/** Service-role client. Server-only: webhooks, cron, admin mutations. */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";

  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: fastServerSupabaseFetch },
  });
}
