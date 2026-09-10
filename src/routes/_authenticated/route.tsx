import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ConfigMissing } from "@/components/ConfigMissing";
import { supabase } from "@/integrations/supabase/client";
import { getSupabasePublicConfig, isSupabaseConfigError } from "@/lib/supabase-env";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const config = getSupabasePublicConfig();
    if (!config.ok) return { user: null, config };
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw redirect({ to: "/auth" });
      return { user: data.user, config };
    } catch (error) {
      if (isSupabaseConfigError(error)) return { user: null, config };
      throw error;
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { config } = Route.useRouteContext();
  if (!config.ok) return <ConfigMissing config={config} />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
