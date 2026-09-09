import type { Platform } from "@/lib/domain";
import { tiktokService } from "./tiktok";
import type { PlatformService } from "./types";
import { youtubeService } from "./youtube";

export const platformServices: Record<Platform, PlatformService> = {
  youtube_shorts: youtubeService,
  tiktok: tiktokService,
};

export const allPlatformServices = Object.values(platformServices);

export const getPlatformService = (platform: Platform): PlatformService =>
  platformServices[platform];

export * from "./types";
