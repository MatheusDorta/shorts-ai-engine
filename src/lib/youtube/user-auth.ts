import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { formatMissingSupabaseConfig, getSupabasePublicConfig } from "@/lib/supabase-env";

/** Same Supabase JWT gate as requireSupabaseAuth, with VITE_* / SSR fallbacks. */

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireYoutubeUser = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const config = getSupabasePublicConfig();
    if (!config.ok) {
      throw new Error(formatMissingSupabaseConfig(config.missing));
    }

    const request = getRequest();
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token.split(".").length !== 3) {
      throw new Error("Unauthorized");
    }

    const supabase = createClient<Database>(config.url, config.publishableKey, {
      global: {
        fetch: createSupabaseFetch(config.publishableKey),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Unauthorized");
    }

    return next({
      context: {
        supabase,
        userId: data.claims.sub,
      },
    });
  },
);
