import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PageError, PageLoading } from "@/components/QueryState";
import { PermissionBadge } from "@/components/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { signedMediaUrl } from "@/lib/media-upload";
import { reviewContent } from "@/lib/workflow";
import { platformLabel, type Platform } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/approval")({ component: Approval });

function MediaPreview({ path, kind }: { path: string | null; kind: "video" | "image" }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedMediaUrl(path)
      .then((next) => {
        if (live) setUrl(next);
      })
      .catch(() => {
        if (live) setUrl(null);
      });
    return () => {
      live = false;
    };
  }, [path]);
  if (!url) return null;
  if (kind === "video") {
    return <video className="mt-3 max-h-64 w-full rounded-md bg-black" src={url} controls />;
  }
  return <img src={url} alt="Thumbnail" className="mt-3 max-h-40 rounded-md object-contain" />;
}

function Approval() {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const q = useQuery({
    queryKey: ["approval"],
    queryFn: async () => {
      const r = await supabase
        .from("content")
        .select(
          "*,sources(name,permission_status),affiliate_links(program),content_platforms(platform)",
        )
        .eq("status", "ready_for_review");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const action = useMutation({
    mutationFn: async ({
      id,
      type,
      rejectionReason,
    }: {
      id: string;
      type: "approved" | "rejected";
      rejectionReason?: string;
    }) => {
      if (type === "rejected" && !rejectionReason?.trim()) {
        throw Error("A rejection reason is required.");
      }
      return reviewContent(id, type, rejectionReason);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["approval"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setRejecting(null);
      setReason("");
      toast.success(vars.type === "approved" ? "Content approved" : "Content rejected");
    },
    onError: (e) => toast.error("Could not update approval", { description: e.message }),
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approval Queue</h1>
        <p className="text-muted-foreground">Human review is required before scheduling.</p>
      </div>
      {q.isLoading && <PageLoading />}
      {q.isError && <PageError error={q.error} onRetry={() => q.refetch()} />}
      {q.data?.map((x) => {
        const blocked = x.sources?.permission_status === "not_allowed";
        return (
          <article key={x.id} className="surface-panel rounded-xl p-5">
            <h2 className="font-semibold">{x.title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Source: {x.sources?.name || "None"}</span>
              {x.sources?.permission_status && (
                <PermissionBadge status={x.sources.permission_status} />
              )}
            </p>
            <MediaPreview path={x.video_path} kind="video" />
            {x.thumbnail_path && <MediaPreview path={x.thumbnail_path} kind="image" />}
            <p className="mt-3 text-sm">{x.hook || x.description || "No description"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {x.hashtags.map((h) => `#${h}`).join(" ") || "No hashtags"} · {x.cta || "No CTA"}
            </p>
            <p className="mt-2 text-sm">Affiliate: {x.affiliate_links?.program || "None"}</p>
            <p className="mt-2 text-sm">
              Platforms:{" "}
              {x.content_platforms.map((p) => platformLabel(p.platform as Platform)).join(", ") ||
                "None"}
            </p>
            {blocked && (
              <p className="mt-3 text-sm text-destructive">
                Approval is blocked because the source is not allowed.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={blocked || action.isPending}
                onClick={() => action.mutate({ id: x.id, type: "approved" })}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                disabled={action.isPending}
                onClick={() => {
                  setRejecting(x.id);
                  setReason("");
                }}
              >
                Reject
              </Button>
              <Button asChild variant="secondary">
                <Link to="/content">Edit</Link>
              </Button>
            </div>
            {rejecting === x.id && (
              <div className="mt-4 space-y-2">
                <Textarea
                  required
                  placeholder="Rejection reason (required)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={action.isPending || !reason.trim()}
                    onClick={() =>
                      action.mutate({ id: x.id, type: "rejected", rejectionReason: reason.trim() })
                    }
                  >
                    Confirm reject
                  </Button>
                  <Button variant="secondary" onClick={() => setRejecting(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </article>
        );
      })}
      {!q.isLoading && !q.data?.length && (
        <EmptyState
          icon={CheckSquare}
          title="Nothing awaiting approval"
          description="Content marked ready for review will appear here."
        />
      )}
    </div>
  );
}
