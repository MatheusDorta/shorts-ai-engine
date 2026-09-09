import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { PageError, PageLoading } from "@/components/QueryState";
import { ContentStatusBadge, PublishingStatusBadge } from "@/components/StatusBadge";
import { platformLabel, type Platform } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const data = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [
        sources,
        content,
        approval,
        scheduled,
        published,
        analytics,
        recent,
        approvalQueue,
        jobs,
        platforms,
      ] = await Promise.all([
        supabase.from("sources").select("id", { count: "exact", head: true }),
        supabase.from("content").select("id", { count: "exact", head: true }),
        supabase
          .from("content")
          .select("id", { count: "exact", head: true })
          .eq("status", "ready_for_review"),
        supabase
          .from("content")
          .select("id", { count: "exact", head: true })
          .eq("status", "scheduled"),
        supabase
          .from("content")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("analytics").select("views,link_clicks,conversions"),
        supabase
          .from("content")
          .select("id,title,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("content")
          .select("id,title,status")
          .eq("status", "ready_for_review")
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("publishing_jobs")
          .select("id,status,platform,scheduled_at,content(title)")
          .in("status", ["scheduled", "waiting", "failed"])
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("content_platforms").select("platform"),
      ]);
      const errors = [
        sources,
        content,
        approval,
        scheduled,
        published,
        analytics,
        recent,
        approvalQueue,
        jobs,
        platforms,
      ]
        .map((x) => x.error)
        .filter((error): error is NonNullable<typeof error> => Boolean(error));
      if (errors[0]) throw errors[0];
      const totals = (analytics.data ?? []).reduce(
        (a, x) => ({
          views: a.views + Number(x.views),
          clicks: a.clicks + Number(x.link_clicks),
          conversions: a.conversions + Number(x.conversions),
        }),
        { views: 0, clicks: 0, conversions: 0 },
      );
      const distribution = (platforms.data ?? []).reduce(
        (acc, row) => {
          acc[row.platform] = (acc[row.platform] ?? 0) + 1;
          return acc;
        },
        { youtube_shorts: 0, tiktok: 0 } as Record<Platform, number>,
      );
      return {
        sources: sources.count ?? 0,
        content: content.count ?? 0,
        approval: approval.count ?? 0,
        scheduled: scheduled.count ?? 0,
        published: published.count ?? 0,
        recent: recent.data ?? [],
        approvalQueue: approvalQueue.data ?? [],
        jobs: jobs.data ?? [],
        distribution,
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
      {data.isLoading && <PageLoading rows={2} />}
      {data.isError && <PageError error={data.error} onRetry={() => data.refetch()} />}
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
        <h2 className="font-semibold">Platform distribution</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(d?.distribution ?? { youtube_shorts: 0, tiktok: 0 }) as Platform[]).map(
            (platform) => (
              <div key={platform} className="flex justify-between text-sm">
                <span>{platformLabel(platform)}</span>
                <span>{d?.distribution[platform] ?? 0}</span>
              </div>
            ),
          )}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel rounded-xl p-6">
          <h2 className="font-semibold">Recent content</h2>
          {d?.recent.length ? (
            <ul className="mt-4 space-y-2">
              {d.recent.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <Link to="/content" className="hover:underline">
                    {item.title}
                  </Link>
                  <ContentStatusBadge status={item.status} />
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
        <section className="surface-panel rounded-xl p-6">
          <h2 className="font-semibold">Approval queue</h2>
          {d?.approvalQueue.length ? (
            <ul className="mt-4 space-y-2">
              {d.approvalQueue.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <Link to="/approval" className="hover:underline">
                    {item.title}
                  </Link>
                  <ContentStatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Nothing awaiting approval.</p>
          )}
        </section>
      </div>
      <section className="surface-panel rounded-xl p-6">
        <h2 className="font-semibold">Publishing queue</h2>
        {d?.jobs.length ? (
          <ul className="mt-4 space-y-2">
            {d.jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap justify-between gap-2">
                <Link to="/publishing" className="hover:underline">
                  {job.content?.title || "Content"} · {platformLabel(job.platform)}
                </Link>
                <PublishingStatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No local publishing jobs.</p>
        )}
      </section>
    </div>
  );
}
