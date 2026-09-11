import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageError, PageLoading } from "@/components/QueryState";
import { integrationConfig } from "@/lib/integrations-config";
import {
  disconnectYoutubeAccount,
  getYoutubeStatus,
  startYoutubeOAuth,
} from "@/lib/youtube/youtube.functions";

type SettingsSearch = {
  youtube?: string;
  reason?: string;
};

export const Route = createFileRoute("/_authenticated/settings")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    const result: SettingsSearch = {};
    if (typeof search["youtube"] === "string") result.youtube = search["youtube"];
    if (typeof search["reason"] === "string") result.reason = search["reason"];
    return result;
  },
  component: Settings,
});

function Settings() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/settings" });
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["youtube-status"],
    queryFn: () => getYoutubeStatus(),
  });

  useEffect(() => {
    if (search.youtube === "connected") {
      toast.success("YouTube connected");
      qc.invalidateQueries({ queryKey: ["youtube-status"] });
      qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      void navigate({ search: {}, replace: true });
    }
    if (search.youtube === "error") {
      toast.error("Could not connect YouTube", {
        description: search.reason ?? "Authorization failed.",
      });
      void navigate({ search: {}, replace: true });
    }
  }, [qc, navigate, search.reason, search.youtube]);

  const connect = useMutation({
    mutationFn: async () => startYoutubeOAuth(),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error("Could not connect YouTube", { description: result.message });
        return;
      }
      window.location.assign(result.authorizationUrl);
    },
    onError: (error) =>
      toast.error("Could not connect YouTube", {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  const disconnect = useMutation({
    mutationFn: async () => disconnectYoutubeAccount(),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error("Could not disconnect YouTube", { description: result.message });
        return;
      }
      qc.invalidateQueries({ queryKey: ["youtube-status"] });
      qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      toast.success("YouTube disconnected");
    },
    onError: (error) =>
      toast.error("Could not disconnect YouTube", {
        description: error instanceof Error ? error.message : undefined,
      }),
  });

  const youtube = status.data;
  const youtubeBusy = connect.isPending || disconnect.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Connect YouTube with official OAuth. Tokens stay on the server and are never sent to the
          browser.
        </p>
      </div>
      <section className="surface-panel rounded-xl p-5">
        <h2 className="font-semibold">Platforms</h2>
        {status.isLoading && <PageLoading />}
        {status.isError && <PageError error={status.error} onRetry={() => status.refetch()} />}
        {youtube && (
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
            <div>
              <p>{integrationConfig.youtube.name}</p>
              <p className="text-sm text-muted-foreground">
                {youtube.connected
                  ? "Connected"
                  : youtube.appConfigured
                    ? "Not connected"
                    : "YouTube OAuth is not configured on the server"}
              </p>
              {youtube.connected && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {youtube.channelName ?? "YouTube channel"}
                  {youtube.channelId ? ` (${youtube.channelId})` : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {youtube.connected ? (
                <Button
                  variant="secondary"
                  disabled={youtubeBusy}
                  onClick={() => disconnect.mutate()}
                >
                  Disconnect YouTube
                </Button>
              ) : (
                <Button
                  disabled={youtubeBusy || !youtube.appConfigured}
                  onClick={() => connect.mutate()}
                >
                  Connect YouTube
                </Button>
              )}
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-between border-b pb-3">
          <span>{integrationConfig.tiktok.name}</span>
          <span className="text-muted-foreground">Platform not connected</span>
        </div>
      </section>
      <section className="surface-panel rounded-xl p-5">
        <h2 className="font-semibold">Automation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Automatic processing, clip detection, AI assistance, publishing, and performance analysis
          are coming in a future version.
        </p>
      </section>
    </div>
  );
}
