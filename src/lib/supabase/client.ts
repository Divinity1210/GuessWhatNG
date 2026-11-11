import { createBrowserClient } from "@supabase/ssr";

async function resilientBrowserSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

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
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(url, key, {
    global: {
      fetch: resilientBrowserSupabaseFetch,
    },
  });
}

/**
 * Builds request headers including the current Supabase Bearer token when available,
 * ensuring API auth succeeds even inside strict mobile in-app browsers (WhatsApp, X, IG).
 */
export async function getAuthHeaders(
  extraHeaders?: Record<string, string>,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
  try {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // Cookie auth remains active on same-origin requests
  }
  return headers;
}
