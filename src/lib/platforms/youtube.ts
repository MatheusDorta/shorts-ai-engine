import { integrationConfig } from "@/lib/integrations-config";
import { notConfigured, type PlatformService } from "./types";

const NAME = "YouTube Shorts";

/**
 * Browser-facing YouTube Shorts stub.
 *
 * Publish Now runs only through the server function `publishYoutubeNow`.
 * This module must not call YouTube or handle tokens.
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
