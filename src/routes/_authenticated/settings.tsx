import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { integrationList } from "@/lib/integrations-config";
export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });
function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Integrations are deliberately disabled until secure server-side OAuth is implemented.
        </p>
      </div>
      <section className="surface-panel rounded-xl p-5">
        <h2 className="font-semibold">Platforms</h2>
        {integrationList.map((x) => (
          <div key={x.key} className="mt-4 flex justify-between border-b pb-3">
            <span>{x.name}</span>
            <span className="text-muted-foreground">Platform not connected</span>
          </div>
        ))}
      </section>
      <section className="surface-panel rounded-xl p-5">
        <h2 className="font-semibold">Automation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Automatic processing, clip detection, AI assistance, publishing, and performance analysis
          are coming in a future version.
        </p>
      </section>
      <SettingsIcon className="text-muted-foreground" />
    </div>
  );
}
