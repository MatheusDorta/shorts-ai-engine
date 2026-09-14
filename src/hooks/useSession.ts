import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSupabasePublicConfig, isSupabaseConfigError } from "@/lib/supabase-env";

export function useSession() {
  const qc = useQueryClient();
  const configured = getSupabasePublicConfig().ok;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<Error | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let active = true;
    const syncCacheOwner = (nextUserId: string | null) => {
      if (userIdRef.current === nextUserId) return;
      userIdRef.current = nextUserId;
      qc.clear();
    };
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError(sessionError);
        setSession(data.session);
        syncCacheOwner(data.session?.user?.id ?? null);
        setLoading(false);
      })
      .catch((caught) => {
        if (!active) return;
        setError(
          isSupabaseConfigError(caught)
            ? caught
            : caught instanceof Error
              ? caught
              : new Error("Could not restore session"),
        );
        setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setError(null);
      syncCacheOwner(next?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured, qc]);

  return { session, user: session?.user ?? null, loading, error, configured };
}
