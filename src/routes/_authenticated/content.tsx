import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { FileVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/_authenticated/content")({ component: Content });
const blank = {
  title: "",
  description: "",
  source_id: "",
  affiliate_link_id: "",
  hook: "",
  caption: "",
  hashtags: "",
  cta: "",
  notes: "",
  status: "draft",
  scheduled_at: "",
  youtube: true,
  tiktok: false,
};
function Content() {
  const qc = useQueryClient();
  const [f, setF] = useState(blank);
  const [id, setId] = useState<string | null>(null);
  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const r = await supabase.from("sources").select("id,name,permission_status");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const links = useQuery({
    queryKey: ["affiliates"],
    queryFn: async () => {
      const r = await supabase.from("affiliate_links").select("id,program").eq("is_active", true);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const list = useQuery({
    queryKey: ["content"],
    queryFn: async () => {
      const r = await supabase
        .from("content")
        .select("*,sources(name,permission_status),content_platforms(platform)")
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
      if (!user) throw Error("Sign in required");
      const source = sources.data?.find((x) => x.id === f.source_id);
      if (source?.permission_status === "not_allowed")
        throw Error("Content cannot use a source marked not allowed.");
      const p = {
        user_id: user.id,
        title: f.title,
        description: f.description || null,
        source_id: f.source_id || null,
        affiliate_link_id: f.affiliate_link_id || null,
        hook: f.hook || null,
        caption: f.caption || null,
        hashtags: f.hashtags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        cta: f.cta || null,
        notes: f.notes || null,
        status: f.status as "draft",
        scheduled_at: f.scheduled_at || null,
      };
      let contentId = id;
      if (id) {
        const r = await supabase.from("content").update(p).eq("id", id);
        if (r.error) throw r.error;
        await supabase.from("content_platforms").delete().eq("content_id", id);
      } else {
        const r = await supabase.from("content").insert(p).select("id").single();
        if (r.error) throw r.error;
        contentId = r.data.id;
      }
      const rows = [f.youtube && "youtube_shorts", f.tiktok && "tiktok"]
        .filter(Boolean)
        .map((platform) => ({
          user_id: user.id,
          content_id: contentId!,
          platform: platform as "youtube_shorts" | "tiktok",
        }));
      if (rows.length) {
        const r = await supabase.from("content_platforms").insert(rows);
        if (r.error) throw r.error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content"] });
      setF(blank);
      setId(null);
      toast.success("Content saved");
    },
    onError: (e) => toast.error("Could not save content", { description: e.message }),
  });
  const del = useMutation({
    mutationFn: async (x: string) => {
      const r = await supabase.from("content").delete().eq("id", x);
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content"] });
      toast.success("Content deleted");
    },
  });
  const set = (k: keyof typeof blank, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Content</h1>
        <p className="text-muted-foreground">Create clips for your owned or permitted sources.</p>
      </div>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
        className="surface-panel grid gap-3 rounded-xl p-5 md:grid-cols-2"
      >
        <Input
          required
          placeholder="Title"
          value={f.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <select
          className="rounded-md border bg-background p-2"
          value={f.source_id}
          onChange={(e) => set("source_id", e.target.value)}
        >
          <option value="">No source</option>
          {sources.data?.map((s) => (
            <option disabled={s.permission_status === "not_allowed"} value={s.id} key={s.id}>
              {s.name}
              {s.permission_status === "not_allowed" ? " — not allowed" : ""}
            </option>
          ))}
        </select>
        <Textarea
          placeholder="Description"
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
        />
        <Input placeholder="Hook" value={f.hook} onChange={(e) => set("hook", e.target.value)} />
        <Input
          placeholder="Hashtags, comma separated"
          value={f.hashtags}
          onChange={(e) => set("hashtags", e.target.value)}
        />
        <Input placeholder="CTA" value={f.cta} onChange={(e) => set("cta", e.target.value)} />
        <select
          className="rounded-md border bg-background p-2"
          value={f.affiliate_link_id}
          onChange={(e) => set("affiliate_link_id", e.target.value)}
        >
          <option value="">No affiliate link</option>
          {links.data?.map((x) => (
            <option value={x.id} key={x.id}>
              {x.program}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background p-2"
          value={f.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {[
            "draft",
            "processing",
            "ready_for_review",
            "approved",
            "rejected",
            "scheduled",
            "published",
            "failed",
          ].map((x) => (
            <option key={x}>{x.replaceAll("_", " ")}</option>
          ))}
        </select>
        <Textarea
          placeholder="Caption"
          value={f.caption}
          onChange={(e) => set("caption", e.target.value)}
        />
        <Textarea
          placeholder="Notes"
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={f.youtube}
            onChange={(e) => set("youtube", e.target.checked)}
          />{" "}
          YouTube Shorts
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={f.tiktok}
            onChange={(e) => set("tiktok", e.target.checked)}
          />{" "}
          TikTok
        </label>
        <div className="flex gap-2">
          <Button disabled={save.isPending}>{id ? "Update" : "Create content"}</Button>
          {id && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setId(null);
                setF(blank);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
      <div className="space-y-3">
        {list.data?.map((x) => (
          <article
            key={x.id}
            className="surface-panel flex flex-wrap justify-between gap-3 rounded-xl p-4"
          >
            <div>
              <b>{x.title}</b>
              <p className="text-sm text-muted-foreground">
                {x.status} · {x.sources?.name || "No source"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setId(x.id);
                  setF({
                    ...blank,
                    title: x.title,
                    description: x.description || "",
                    source_id: x.source_id || "",
                    affiliate_link_id: x.affiliate_link_id || "",
                    hook: x.hook || "",
                    caption: x.caption || "",
                    hashtags: x.hashtags.join(", "),
                    cta: x.cta || "",
                    notes: x.notes || "",
                    status: x.status,
                    youtube: x.content_platforms.some((p) => p.platform === "youtube_shorts"),
                    tiktok: x.content_platforms.some((p) => p.platform === "tiktok"),
                  });
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => del.mutate(x.id)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
        {!list.isLoading && !list.data?.length && (
          <EmptyState
            icon={FileVideo}
            title="No content yet"
            description="Create your first short-form content item."
          />
        )}
      </div>
    </div>
  );
}
