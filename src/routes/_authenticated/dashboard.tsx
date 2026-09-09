import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { BarChart3, FileVideo } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });
function Dashboard() {
  const data = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [sources, content, approval, scheduled, published, analytics, recent] =
        await Promise.all([
          supabase.from("sources").select("id", { count: "exact", head: true }),
          supabase.from("content").select("id", { count: "exact", head: true }),
          supabase
            .from("content")
            .select("id", { count: "exact", head: true })
            .eq("status", "ready_for_review"),
          supabase
            .from("publishing_jobs")
            .select("id", { count: "exact", head: true })
            .eq("status", "scheduled"),
          supabase
            .from("publishing_jobs")
            .select("id", { count: "exact", head: true })
            .eq("status", "published"),
          supabase.from("analytics").select("views,link_clicks,conversions"),
          supabase
            .from("content")
            .select("id,title,status,created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);
      const errors = [sources, content, approval, scheduled, published, analytics, recent]
        .map((x) => x.error)
        .filter(Boolean);
      if (errors.length) throw errors[0];
      const totals = (analytics.data ?? []).reduce(
        (a, x) => ({
          views: a.views + Number(x.views),
          clicks: a.clicks + Number(x.link_clicks),
          conversions: a.conversions + Number(x.conversions),
        }),
        { views: 0, clicks: 0, conversions: 0 },
      );
      return {
        sources: sources.count ?? 0,
        content: content.count ?? 0,
        approval: approval.count ?? 0,
        scheduled: scheduled.count ?? 0,
        published: published.count ?? 0,
        recent: recent.data ?? [],
        ...totals,
      };
    },
  });
  const d = data.data;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Your real content operations data.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total sources", d?.sources],
          ["Total content", d?.content],
          ["Awaiting approval", d?.approval],
          ["Scheduled posts", d?.scheduled],
          ["Published posts", d?.published],
          ["Total views", d?.views],
          ["Affiliate clicks", d?.clicks],
          ["Conversions", d?.conversions],
        ].map(([label, value]) => (
          <StatCard
            key={String(label)}
            label={String(label)}
            value={data.isLoading ? "…" : Number(value ?? 0).toLocaleString()}
            icon={BarChart3}
          />
        ))}
      </div>
      <section className="surface-panel rounded-xl p-6">
        <h2 className="font-semibold">Recent content</h2>
        {d?.recent.length ? (
          <ul className="mt-4 space-y-2">
            {d.recent.map((item) => (
              <li key={item.id} className="flex justify-between">
                <Link to="/content" className="hover:underline">
                  {item.title}
                </Link>
                <span className="text-sm text-muted-foreground">{item.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={FileVideo}
            title="No content yet"
            description="Add a source, then create your first content item."
          />
        )}
      </section>
    </div>
  );
}
