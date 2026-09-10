import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { PageError, PageLoading } from "@/components/QueryState";
import { Library } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sources")({ component: Sources });
type SourceForm = {
  name: string;
  url: string;
  source_type: "youtube" | "podcast" | "live_stream" | "upload" | "other";
  creator_name: string;
  permission_status:
    "confirmed_permission" | "licensed" | "own_content" | "unknown" | "not_allowed";
  notes: string;
};
const initial: SourceForm = {
  name: "",
  url: "",
  source_type: "youtube",
  creator_name: "",
  permission_status: "unknown",
  notes: "",
};
function Sources() {
  const qc = useQueryClient();
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const r = await supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const payload = {
        ...form,
        url: form.url || null,
        creator_name: form.creator_name || null,
        notes: form.notes || null,
        user_id: user.id,
      };
      const r = editing
        ? await supabase.from("sources").update(payload).eq("id", editing)
        : await supabase.from("sources").insert(payload);
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      setForm(initial);
      setEditing(null);
      toast.success("Source saved");
    },
    onError: (e) => toast.error("Could not save source", { description: e.message }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await supabase.from("sources").delete().eq("id", id);
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Source deleted");
    },
    onError: (e) => toast.error("Could not delete source", { description: e.message }),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  const update = (key: keyof SourceForm, value: string) => setForm((x) => ({ ...x, [key]: value }));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Sources</h1>
        <p className="text-muted-foreground">Track licensed and permission-safe source material.</p>
      </div>
      <form onSubmit={submit} className="surface-panel grid gap-3 rounded-xl p-5 md:grid-cols-2">
        <Input
          required
          placeholder="Source name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
        <Input
          placeholder="Source URL"
          type="url"
          value={form.url}
          onChange={(e) => update("url", e.target.value)}
        />
        <select
          className="rounded-md border bg-background p-2"
          value={form.source_type}
          onChange={(e) => update("source_type", e.target.value as SourceForm["source_type"])}
        >
          {["youtube", "podcast", "live_stream", "upload", "other"].map((x) => (
            <option key={x} value={x}>
              {x.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Input
          placeholder="Creator/channel"
          value={form.creator_name}
          onChange={(e) => update("creator_name", e.target.value)}
        />
        <select
          className="rounded-md border bg-background p-2"
          value={form.permission_status}
          onChange={(e) =>
            update("permission_status", e.target.value as SourceForm["permission_status"])
          }
        >
          {["confirmed_permission", "licensed", "own_content", "unknown", "not_allowed"].map(
            (x) => (
              <option key={x} value={x}>
                {x.replaceAll("_", " ")}
              </option>
            ),
          )}
        </select>
        <Textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
        <div className="flex gap-2 md:col-span-2">
          <Button disabled={save.isPending}>{editing ? "Update source" : "Add source"}</Button>
          {editing && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setForm(initial);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
      {sources.isLoading && <PageLoading />}
      {sources.isError && <PageError error={sources.error} onRetry={() => sources.refetch()} />}
      <div className="space-y-3">
        {sources.data?.map((s) => (
          <article
            key={s.id}
            className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
          >
            <div>
              <b>{s.name}</b>
              <p className="text-sm text-muted-foreground">
                {s.source_type} · {s.creator_name || "No creator"}
              </p>
              {["unknown", "not_allowed"].includes(s.permission_status) && (
                <p className="mt-1 text-sm text-destructive">
                  Permission: {s.permission_status.replaceAll("_", " ")}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditing(s.id);
                  setForm({
                    name: s.name,
                    url: s.url || "",
                    source_type: s.source_type,
                    creator_name: s.creator_name || "",
                    permission_status: s.permission_status,
                    notes: s.notes || "",
                  });
                }}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(s.id)}
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
        {!sources.isLoading && !sources.data?.length && (
          <EmptyState
            icon={Library}
            title="No sources yet"
            description="Add a rights-cleared source to begin."
          />
        )}
      </div>
    </div>
  );
}
