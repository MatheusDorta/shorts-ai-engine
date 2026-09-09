import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/_authenticated/approval")({ component: Approval });
function Approval() {
  const qc = useQueryClient();
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
      reason,
    }: {
      id: string;
      type: "approved" | "rejected";
      reason?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw Error("Sign in required");
      const item = q.data?.find((x) => x.id === id);
      if (type === "approved" && item?.sources?.permission_status === "not_allowed")
        throw Error("Cannot approve content from a not-allowed source.");
      if (type === "rejected" && !reason) throw Error("A rejection reason is required.");
      const update = {
        status: type === "approved" ? "approved" : "rejected",
        approved_at: type === "approved" ? new Date().toISOString() : null,
        approved_by: type === "approved" ? user.id : null,
        rejection_reason: reason || null,
      };
      const r = await supabase.from("content").update(update).eq("id", id);
      if (r.error) throw r.error;
      const a = await supabase
        .from("approval_actions")
        .insert({ user_id: user.id, content_id: id, action: type, reason: reason || null });
      if (a.error) throw a.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval"] });
      qc.invalidateQueries({ queryKey: ["content"] });
      toast.success("Approval recorded");
    },
    onError: (e) => toast.error("Could not update approval", { description: e.message }),
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approval Queue</h1>
        <p className="text-muted-foreground">Human review is required before scheduling.</p>
      </div>
      {q.data?.map((x) => (
        <article key={x.id} className="surface-panel rounded-xl p-5">
          <h2 className="font-semibold">{x.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Source: {x.sources?.name || "None"} · Permission:{" "}
            {x.sources?.permission_status || "unknown"}
          </p>
          <p className="mt-3 text-sm">{x.hook || x.description || "No description"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {x.hashtags.map((h) => `#${h}`).join(" ")} · {x.cta || "No CTA"}
          </p>
          <p className="mt-2 text-sm">
            Platforms: {x.content_platforms.map((p) => p.platform).join(", ") || "None"}
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              disabled={x.sources?.permission_status === "not_allowed"}
              onClick={() => action.mutate({ id: x.id, type: "approved" })}
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const reason = window.prompt("Rejection reason (required)");
                if (reason) action.mutate({ id: x.id, type: "rejected", reason });
              }}
            >
              Reject
            </Button>
          </div>
        </article>
      ))}
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
