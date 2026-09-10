import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getSupabasePublicConfig, isSupabaseConfigError } from "@/lib/supabase-env";

export function useSession() {
  const configured = getSupabasePublicConfig().ok;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError(sessionError);
        setSession(data.session);
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
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  return { session, user: session?.user ?? null, loading, error, configured };
}
