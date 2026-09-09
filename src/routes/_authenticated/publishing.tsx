import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PageError, PageLoading } from "@/components/QueryState";
import { PublishingStatusBadge } from "@/components/StatusBadge";
import { integrationConfig } from "@/lib/integrations-config";
import { platformLabel, type Platform, type PublishingStatus } from "@/lib/domain";
import { cancelPublishingJob, retryPublishingJob } from "@/lib/workflow";

export const Route = createFileRoute("/_authenticated/publishing")({ component: Publishing });

const QUEUE_TABS: { key: "scheduled" | "waiting" | "failed"; label: string }[] = [
  { key: "scheduled", label: "Scheduled" },
  { key: "waiting", label: "Waiting" },
  { key: "failed", label: "Failed" },
];

function connectionLabel(platform: Platform) {
  const configured =
    platform === "youtube_shorts"
      ? integrationConfig.youtube.configured
      : integrationConfig.tiktok.configured;
  return configured ? "Connected" : "NOT CONNECTED";
}

function Publishing() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const r = await supabase
        .from("publishing_jobs")
        .select("*,content(title,video_path)")
        .order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data;
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => cancelPublishingJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Job cancelled locally");
    },
    onError: (e) => toast.error("Could not cancel job", { description: e.message }),
  });

  const retry = useMutation({
    mutationFn: async (id: string) => retryPublishingJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Job retried locally. Platform not connected.");
    },
    onError: (e) => toast.error("Could not retry job", { description: e.message }),
  });

  const jobs = q.data ?? [];
  const counts = {
    scheduled: jobs.filter((x) => x.status === "scheduled").length,
    waiting: jobs.filter((x) => x.status === "waiting").length,
    failed: jobs.filter((x) => x.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Publishing Queue</h1>
        <p className="text-muted-foreground">
          Local queue only. YouTube Shorts and TikTok remain not connected until official OAuth is
          added.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface-panel rounded-xl p-4">
          <p className="text-sm font-medium">YouTube Shorts</p>
          <p className="text-sm text-muted-foreground">{connectionLabel("youtube_shorts")}</p>
        </div>
        <div className="surface-panel rounded-xl p-4">
          <p className="text-sm font-medium">TikTok</p>
          <p className="text-sm text-muted-foreground">{connectionLabel("tiktok")}</p>
        </div>
      </div>
      {q.isLoading && <PageLoading />}
      {q.isError && <PageError error={q.error} onRetry={() => q.refetch()} />}
      {QUEUE_TABS.map((tab) => {
        const items = jobs.filter((x) => x.status === tab.key);
        return (
          <section key={tab.key} className="space-y-3">
            <h2 className="font-semibold">
              {tab.label} (
              {tab.key === "scheduled"
                ? counts.scheduled
                : tab.key === "waiting"
                  ? counts.waiting
                  : counts.failed}
              )
            </h2>
            {items.map((x) => (
              <JobCard
                key={x.id}
                job={x}
                onCancel={() => cancel.mutate(x.id)}
                onRetry={() => retry.mutate(x.id)}
                busy={cancel.isPending || retry.isPending}
              />
            ))}
            {!q.isLoading && !items.length && (
              <p className="text-sm text-muted-foreground">No {tab.label.toLowerCase()} jobs.</p>
            )}
          </section>
        );
      })}
      {!q.isLoading && !jobs.length && (
        <EmptyState
          icon={Send}
          title="No publishing jobs"
          description="Schedule approved content to add a local queue job. Nothing is published externally."
        />
      )}
    </div>
  );
}

function JobCard({
  job,
  onCancel,
  onRetry,
  busy,
}: {
  job: {
    id: string;
    platform: Platform;
    status: PublishingStatus;
    scheduled_at: string | null;
    result: string | null;
    error_message: string | null;
    content: { title: string } | null;
  };
  onCancel: () => void;
  onRetry: () => void;
  busy: boolean;
}) {
  const canCancel = job.status === "scheduled" || job.status === "waiting";
  const canRetry = job.status === "failed";
  return (
    <article className="surface-panel flex flex-wrap justify-between gap-3 rounded-xl p-4">
      <div>
        <b>{job.content?.title || "Content"}</b>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{platformLabel(job.platform)}</span>
          <PublishingStatusBadge status={job.status} />
          <span>NOT CONNECTED</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : "No scheduled time"}
        </p>
        {job.result && <p className="mt-1 text-sm">{job.result}</p>}
        {job.error_message && <p className="mt-1 text-sm text-destructive">{job.error_message}</p>}
      </div>
      <div className="flex gap-2">
        {canCancel && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        )}
        {canRetry && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </article>
  );
}
