import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/_authenticated/publishing")({ component: Publishing });
function Publishing() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const r = await supabase
        .from("publishing_jobs")
        .select("*,content(title)")
        .order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const set = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "waiting" | "scheduled" }) => {
      const r = await supabase.from("publishing_jobs").update({ status }).eq("id", id);
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Local queue updated");
    },
    onError: (e) => toast.error("Could not update queue", { description: e.message }),
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Publishing Queue</h1>
        <p className="text-muted-foreground">
          Platform not connected — jobs remain local until official OAuth integrations are added.
        </p>
      </div>
      {q.data?.map((x) => (
        <article
          className="surface-panel flex flex-wrap justify-between gap-3 rounded-xl p-4"
          key={x.id}
        >
          <div>
            <b>{x.content?.title || "Content"}</b>
            <p className="text-sm text-muted-foreground">
              {x.platform} · {x.status} · Platform not connected
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => set.mutate({ id: x.id, status: "scheduled" })}
            >
              Schedule
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => set.mutate({ id: x.id, status: "waiting" })}
            >
              Cancel / Retry
            </Button>
          </div>
        </article>
      ))}
      {!q.isLoading && !q.data?.length && (
        <EmptyState
          icon={Send}
          title="No publishing jobs"
          description="Approved content can be added to the local queue in a future scheduling action."
        />
      )}
    </div>
  );
}
