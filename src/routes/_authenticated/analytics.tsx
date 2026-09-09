import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
export const Route = createFileRoute("/_authenticated/analytics")({ component: Analytics });
function Analytics() {
  const q = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const r = await supabase
        .from("analytics")
        .select("*,content(title)")
        .order("stat_date", { ascending: false });
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const t = (q.data || []).reduce(
    (a, x) => ({
      views: a.views + Number(x.views),
      likes: a.likes + Number(x.likes),
      comments: a.comments + Number(x.comments),
      shares: a.shares + Number(x.shares),
      follows: a.follows + Number(x.follows),
      clicks: a.clicks + Number(x.link_clicks),
      conversions: a.conversions + Number(x.conversions),
      revenue: a.revenue + Number(x.revenue),
    }),
    {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      follows: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    },
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Only records collected from real platform or tracking data appear here.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(t).map(([k, v]) => (
          <StatCard
            key={k}
            label={k}
            value={
              k === "revenue"
                ? v.toLocaleString(undefined, { style: "currency", currency: "USD" })
                : v.toLocaleString()
            }
            icon={BarChart3}
          />
        ))}
      </div>
      {!q.isLoading && !q.data?.length ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics data"
          description="Connect official platforms in a future phase to collect real performance data."
        />
      ) : (
        <div className="space-y-2">
          {q.data?.map((x) => (
            <div className="surface-panel rounded-lg p-3" key={x.id}>
              {x.stat_date} · {x.platform} · {x.content?.title || "All content"} · {x.views} views
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
