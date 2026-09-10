export type Platform = "youtube_shorts" | "tiktok";
export type PermissionStatus =
  "confirmed_permission" | "licensed" | "own_content" | "unknown" | "not_allowed";
export type ContentStatus =
  | "draft"
  | "processing"
  | "ready_for_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "failed";
export type PublishingStatus =
  "waiting" | "scheduled" | "publishing" | "published" | "failed" | "cancelled";

const MANUAL_CONTENT_STATUSES: ContentStatus[] = [
  "draft",
  "processing",
  "ready_for_review",
  "approved",
  "rejected",
  "scheduled",
];

export function isManualContentStatus(status: string): status is ContentStatus {
  return (MANUAL_CONTENT_STATUSES as string[]).includes(status);
}

export function hasSelectedPlatform(youtube: boolean, tiktok: boolean) {
  return Boolean(youtube || tiktok);
}

export function selectedPlatforms(input: Array<Platform | { platform: Platform }>): Platform[] {
  return input.map((item) => (typeof item === "string" ? item : item.platform));
}

export function canScheduleContent(input: {
  status: ContentStatus;
  permissionStatus?: PermissionStatus | null | undefined;
  platforms: Array<Platform | { platform: Platform }>;
}): { allowed: boolean; reason: string | null } {
  if (input.status !== "approved" && input.status !== "scheduled") {
    return {
      allowed: false,
      reason: "Only approved or already scheduled content can be scheduled.",
    };
  }
  if (input.permissionStatus === "not_allowed") {
    return {
      allowed: false,
      reason: "Content cannot use a source marked not allowed.",
    };
  }
  if (!selectedPlatforms(input.platforms).length) {
    return {
      allowed: false,
      reason: "Select YouTube Shorts or TikTok on this content item before scheduling.",
    };
  }
  return { allowed: true, reason: null };
}

export function isPlatformOnContent(
  platforms: Array<Platform | { platform: Platform }>,
  platform: Platform,
) {
  return selectedPlatforms(platforms).includes(platform);
}

export function canCancelPublishingJob(status: PublishingStatus) {
  return status === "scheduled" || status === "waiting";
}

export function canRetryPublishingJob(status: PublishingStatus) {
  return status === "failed";
}

export function blocksManualPublishedStatus(status: ContentStatus) {
  return status === "published";
}
