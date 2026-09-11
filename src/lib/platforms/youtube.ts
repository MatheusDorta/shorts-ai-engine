import { integrationConfig } from "@/lib/integrations-config";
import { notConfigured, type PlatformService } from "./types";

const NAME = "YouTube Shorts";

/**
 * YouTube Shorts publishing stub.
 *
 * Phase 1 added server-side OAuth connection only. This service remains a stub
 * until Phase 2 implements videos.insert. Do not treat a connected account as
 * a live publishing integration.
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
