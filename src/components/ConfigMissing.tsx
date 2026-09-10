import { AlertTriangle } from "lucide-react";
import { formatMissingSupabaseConfig, type ResolvedSupabasePublicConfig } from "@/lib/supabase-env";

export function ConfigMissing({
  config,
}: {
  config: Extract<ResolvedSupabasePublicConfig, { ok: false }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface-panel w-full max-w-lg rounded-2xl p-6">
        <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">Deployment configuration required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatMissingSupabaseConfig(config.missing)}
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
          {config.missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Use the existing production Supabase project. Do not create or connect a new database.
        </p>
      </div>
    </div>
  );
}
