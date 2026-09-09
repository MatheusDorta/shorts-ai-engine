import { integrationConfig } from "@/lib/integrations-config";
import { notConfigured, type PlatformService } from "./types";

const NAME = "YouTube Shorts";

/**
 * YouTube Shorts service stub.
 *
 * Future implementation: YouTube Data API v3 (videos.insert) called from a
 * server function using an OAuth refresh token stored as a server secret.
 */
export const youtubeService: PlatformService = {
  platform: "youtube_shorts",
  name: NAME,
  apiName: "YouTube Data API v3",
  isConfigured: () => integrationConfig.youtube.configured,
  connect: async () => notConfigured(NAME),
  disconnect: async () => notConfigured(NAME),
  publishVideo: async () => notConfigured(NAME),
  scheduleVideo: async () => notConfigured(NAME),
  getAnalytics: async () => notConfigured(NAME),
};
