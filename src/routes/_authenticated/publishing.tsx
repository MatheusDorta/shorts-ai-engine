import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PageError, PageLoading } from "@/components/QueryState";
import { PublishingStatusBadge } from "@/components/StatusBadge";
import {
  platformLabel,
  type ContentStatus,
  type PermissionStatus,
  type Platform,
  type PublishingStatus,
} from "@/lib/domain";
import { cancelPublishingJob, retryPublishingJob } from "@/lib/workflow";
import {
  canCancelPublishingJob,
  canPublishYoutubeNow,
  canRetryPublishingJob,
} from "@/lib/workflow-rules";
import { publishYoutubeNow } from "@/lib/youtube/youtube.functions";

export const Route = createFileRoute("/_authenticated/publishing")({ component: Publishing });

const QUEUE_TABS: {
  key: "scheduled" | "waiting" | "publishing" | "published" | "failed" | "cancelled";
  label: string;
}[] = [
  { key: "scheduled", label: "Scheduled" },
  { key: "waiting", label: "Waiting" },
  { key: "publishing", label: "Publishing" },
  { key: "published", label: "Published" },
  { key: "failed", label: "Failed" },
  { key: "cancelled", label: "Cancelled" },
];

function connectionLabel(
  platform: Platform,
  accounts: Array<{ platform: Platform; is_connected: boolean }> | undefined,
) {
  if (platform === "tiktok") return "NOT CONNECTED";
  const account = accounts?.find((row) => row.platform === platform);
  return account?.is_connected ? "Connected" : "NOT CONNECTED";
}

function Publishing() {
  const qc = useQueryClient();
  const accounts = useQuery({
    queryKey: ["platform-accounts"],
    queryFn: async () => {
      const r = await supabase
        .from("platform_accounts")
        .select("platform,is_connected,account_name");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const q = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const r = await supabase
        .from("publishing_jobs")
        .select("*,content(title,video_path,status,sources(permission_status))")
        .order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["jobs"] });
    qc.invalidateQueries({ queryKey: ["content"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const cancel = useMutation({
    mutationFn: async (id: string) => cancelPublishingJob(id),
    onSuccess: () => {
      invalidate();
      toast.success("Job cancelled locally");
    },
    onError: (e) => toast.error("Could not cancel job", { description: e.message }),
  });

  const retry = useMutation({
    mutationFn: async (id: string) => retryPublishingJob(id),
    onSuccess: () => {
      invalidate();
      toast.success("Job retried locally. Use Publish Now to upload to YouTube.");
    },
    onError: (e) => toast.error("Could not retry job", { description: e.message }),
  });

  const publishNow = useMutation({
    mutationFn: async (input: { contentId: string; jobId: string }) =>
      publishYoutubeNow({ data: input }),
    onSuccess: (result) => {
      invalidate();
      if (!result.ok) {
        toast.error("Could not publish to YouTube", { description: result.message });
        return;
      }
      toast.success("Published privately to YouTube", {
        description: `${result.videoId} — ${result.videoUrl}`,
      });
    },
    onError: (e) =>
      toast.error("Could not publish to YouTube", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const jobs = q.data ?? [];
  const youtubeConnected =
    connectionLabel("youtube_shorts", accounts.data ?? undefined) === "Connected";
  const counts = {
    scheduled: jobs.filter((x) => x.status === "scheduled").length,
    waiting: jobs.filter((x) => x.status === "waiting").length,
    publishing: jobs.filter((x) => x.status === "publishing").length,
    published: jobs.filter((x) => x.status === "published").length,
    failed: jobs.filter((x) => x.status === "failed").length,
    cancelled: jobs.filter((x) => x.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Publishing Queue</h1>
        <p className="text-muted-foreground">
          Publish Now uploads privately to YouTube. TikTok remains not connected.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface-panel rounded-xl p-4">
          <p className="text-sm font-medium">YouTube Shorts</p>
          <p className="text-sm text-muted-foreground">
            {connectionLabel("youtube_shorts", accounts.data ?? undefined)}
          </p>
        </div>
        <div className="surface-panel rounded-xl p-4">
          <p className="text-sm font-medium">TikTok</p>
          <p className="text-sm text-muted-foreground">
            {connectionLabel("tiktok", accounts.data ?? undefined)}
          </p>
        </div>
      </div>
      {q.isLoading && <PageLoading />}
      {q.isError && <PageError error={q.error} onRetry={() => q.refetch()} />}
      {QUEUE_TABS.map((tab) => {
        const items = jobs.filter((x) => x.status === tab.key);
        return (
          <section key={tab.key} className="space-y-3">
            <h2 className="font-semibold">
              {tab.label} ({counts[tab.key]})
            </h2>
            {items.map((x) => (
              <JobCard
                key={x.id}
                job={x}
                youtubeConnected={youtubeConnected}
                onCancel={() => cancel.mutate(x.id)}
                onRetry={() => retry.mutate(x.id)}
                onPublishNow={() => publishNow.mutate({ contentId: x.content_id, jobId: x.id })}
                busy={cancel.isPending || retry.isPending || publishNow.isPending}
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
          description="Schedule approved content or use Publish Now to upload privately to YouTube."
        />
      )}
    </div>
  );
}

function JobCard({
  job,
  youtubeConnected,
  onCancel,
  onRetry,
  onPublishNow,
  busy,
}: {
  job: {
    id: string;
    content_id: string;
    platform: Platform;
    status: PublishingStatus;
    scheduled_at: string | null;
    result: string | null;
    error_message: string | null;
    remote_id: string | null;
    remote_url: string | null;
    content: {
      title: string;
      video_path: string | null;
      status: ContentStatus;
      sources: { permission_status: PermissionStatus | null } | null;
    } | null;
  };
  youtubeConnected: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onPublishNow: () => void;
  busy: boolean;
}) {
  const canCancel = canCancelPublishingJob(job.status);
  const canRetry = canRetryPublishingJob(job.status);
  const publishCheck = canPublishYoutubeNow({
    youtubeConnected,
    contentStatus: job.content?.status ?? "draft",
    permissionStatus: job.content?.sources?.permission_status,
    platforms: [job.platform],
    hasVideo: Boolean(job.content?.video_path),
    jobStatus: job.status,
    activeJobExists: job.status === "publishing",
  });
  const showPublishNow = job.platform === "youtube_shorts" && publishCheck.allowed;
  return (
    <article className="surface-panel flex flex-wrap justify-between gap-3 rounded-xl p-4">
      <div>
        <b>{job.content?.title || "Content"}</b>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{platformLabel(job.platform)}</span>
          <PublishingStatusBadge status={job.status} />
          <span>
            {job.platform === "youtube_shorts"
              ? youtubeConnected
                ? "Connected"
                : "NOT CONNECTED"
              : "NOT CONNECTED"}
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : "No scheduled time"}
        </p>
        {job.result && <p className="mt-1 text-sm">{job.result}</p>}
        {job.remote_id && (
          <p className="mt-1 text-sm">
            YouTube video ID: {job.remote_id}
            {job.remote_url ? (
              <>
                {" "}
                —{" "}
                <a className="underline" href={job.remote_url} target="_blank" rel="noreferrer">
                  {job.remote_url}
                </a>
              </>
            ) : null}
          </p>
        )}
        {job.error_message && <p className="mt-1 text-sm text-destructive">{job.error_message}</p>}
      </div>
      <div className="flex gap-2">
        {showPublishNow && (
          <Button size="sm" disabled={busy} onClick={onPublishNow}>
            Publish Now
          </Button>
        )}
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
