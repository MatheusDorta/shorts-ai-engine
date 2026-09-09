import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
export const Route = createFileRoute("/_authenticated/affiliates")({ component: Affiliates });
const blank = {
  company: "",
  program: "",
  url: "",
  tracking_url: "",
  description: "",
  notes: "",
  is_active: true,
};
function Affiliates() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [id, setId] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["affiliates"],
    queryFn: async () => {
      const r = await supabase
        .from("affiliate_links")
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
      if (!user) throw Error("Sign in required");
      const p = {
        ...form,
        company: form.company || null,
        tracking_url: form.tracking_url || null,
        description: form.description || null,
        notes: form.notes || null,
        user_id: user.id,
      };
      const r = id
        ? await supabase.from("affiliate_links").update(p).eq("id", id)
        : await supabase.from("affiliate_links").insert(p);
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliates"] });
      setId(null);
      setForm(blank);
      toast.success("Affiliate link saved");
    },
    onError: (e) => toast.error("Could not save link", { description: e.message }),
  });
  const del = useMutation({
    mutationFn: async (x: string) => {
      const r = await supabase.from("affiliate_links").delete().eq("id", x);
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliates"] });
      toast.success("Affiliate link deleted");
    },
  });
  const set = (k: keyof typeof blank, v: string | boolean) => setForm((x) => ({ ...x, [k]: v }));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Affiliate Links</h1>
        <p className="text-muted-foreground">
          Store programs and tracking URLs; no network integrations are used.
        </p>
      </div>
      <form
        className="surface-panel grid gap-3 rounded-xl p-5 md:grid-cols-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Input
          required
          placeholder="Program"
          value={form.program}
          onChange={(e) => set("program", e.target.value)}
        />
        <Input
          placeholder="Company"
          value={form.company}
          onChange={(e) => set("company", e.target.value)}
        />
        <Input
          required
          type="url"
          placeholder="Destination URL"
          value={form.url}
          onChange={(e) => set("url", e.target.value)}
        />
        <Input
          type="url"
          placeholder="Tracking URL"
          value={form.tracking_url}
          onChange={(e) => set("tracking_url", e.target.value)}
        />
        <Textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
        <Textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
          />{" "}
          Active
        </label>
        <div className="flex gap-2">
          <Button disabled={save.isPending}>{id ? "Update" : "Add link"}</Button>
          {id && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setId(null);
                setForm(blank);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
      <div className="space-y-3">
        {q.data?.map((x) => (
          <article className="surface-panel flex justify-between gap-3 rounded-xl p-4" key={x.id}>
            <div>
              <b>{x.program}</b>
              <p className="text-sm text-muted-foreground">
                {x.company || "No company"} · {x.is_active ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setId(x.id);
                  setForm({
                    company: x.company || "",
                    program: x.program,
                    url: x.url,
                    tracking_url: x.tracking_url || "",
                    description: x.description || "",
                    notes: x.notes || "",
                    is_active: x.is_active,
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
        {!q.isLoading && !q.data?.length && (
          <EmptyState
            icon={Link2}
            title="No affiliate links"
            description="Add an affiliate program when you are ready."
          />
        )}
      </div>
    </div>
  );
}
