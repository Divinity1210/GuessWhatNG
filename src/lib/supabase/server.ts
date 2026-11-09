import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function resilientServerSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const attemptFetch = async (timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  try {
    return await attemptFetch(12000);
  } catch {
    // Retry once on transient serverless socket reset / TLS cold start
    return await attemptFetch(12000);
  }
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(url, key, {
    global: { fetch: resilientServerSupabaseFetch },
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
    global: { fetch: resilientServerSupabaseFetch },
  });
}
