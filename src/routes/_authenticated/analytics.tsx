import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { PageError, PageLoading } from "@/components/QueryState";
import { Input } from "@/components/ui/input";
import { platformLabel, type Platform } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/analytics")({ component: Analytics });

function Analytics() {
  const [contentId, setContentId] = useState("");
  const [platform, setPlatform] = useState<"" | Platform>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const contents = useQuery({
    queryKey: ["content-options"],
    queryFn: async () => {
      const r = await supabase
        .from("content")
        .select("id,title")
        .order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data;
    },
  });

  const q = useQuery({
    queryKey: ["analytics", contentId, platform, from, to],
    queryFn: async () => {
      let query = supabase.from("analytics").select("*,content(title)").order("stat_date", {
        ascending: false,
      });
      if (contentId) query = query.eq("content_id", contentId);
      if (platform) query = query.eq("platform", platform);
      if (from) query = query.gte("stat_date", from);
      if (to) query = query.lte("stat_date", to);
      const r = await query;
      if (r.error) throw r.error;
      return r.data;
    },
  });

  const t = useMemo(
    () =>
      (q.data || []).reduce(
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
      ),
    [q.data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">
          Only records collected from real platform or tracking data appear here.
        </p>
      </div>
      <div className="surface-panel grid gap-3 rounded-xl p-4 md:grid-cols-4">
        <select
          className="rounded-md border bg-background p-2"
          value={contentId}
          onChange={(e) => setContentId(e.target.value)}
        >
          <option value="">All content</option>
          {contents.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background p-2"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as "" | Platform)}
        >
          <option value="">All platforms</option>
          <option value="youtube_shorts">YouTube Shorts</option>
          <option value="tiktok">TikTok</option>
        </select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {q.isLoading && <PageLoading />}
      {q.isError && <PageError error={q.error} onRetry={() => q.refetch()} />}
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
              {x.stat_date} · {platformLabel(x.platform)} · {x.content?.title || "All content"} ·{" "}
              {x.views} views
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
