import { integrationConfig } from "@/lib/integrations-config";
import { notConfigured, type PlatformService } from "./types";

const NAME = "TikTok";

/**
 * TikTok service stub.
 *
 * Future implementation: TikTok Content Posting API called from a server
 * function using OAuth credentials stored as server secrets.
 */
export const tiktokService: PlatformService = {
  platform: "tiktok",
  name: NAME,
  apiName: "TikTok Content Posting API",
  isConfigured: () => integrationConfig.tiktok.configured,
  connect: async () => notConfigured(NAME),
  disconnect: async () => notConfigured(NAME),
  publishVideo: async () => notConfigured(NAME),
  scheduleVideo: async () => notConfigured(NAME),
  getAnalytics: async () => notConfigured(NAME),
};
