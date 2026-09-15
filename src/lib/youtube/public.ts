export type YouTubeConnectionStatus = {
  appConfigured: boolean;
  connected: boolean;
  channelId: string | null;
  channelName: string | null;
};

export type YouTubeConnectResult =
  | { ok: true; authorizationUrl: string }
  | { ok: false; code: "not_configured" | "unauthorized" | "error"; message: string };

export type YouTubeDisconnectResult =
  { ok: true } | { ok: false; code: "unauthorized" | "error"; message: string };

export type YouTubePublishNowResult =
  | {
      ok: true;
      jobId: string;
      videoId: string;
      videoUrl: string;
      privacyStatus: "public";
    }
  | { ok: false; code: "unauthorized" | "not_configured" | "error"; message: string };

export type YouTubeScheduleResult =
  | {
      ok: true;
      jobId: string;
      videoId: string;
      videoUrl: string;
      privacyStatus: "private";
      publishAt: string;
    }
  | { ok: false; code: "unauthorized" | "not_configured" | "error"; message: string };
