import type { Database } from "@/integrations/supabase/types";

export type Platform = Database["public"]["Enums"]["platform"];
export type SourceType = Database["public"]["Enums"]["source_type"];
export type PermissionStatus = Database["public"]["Enums"]["permission_status"];
export type ContentStatus = Database["public"]["Enums"]["content_status"];
export type PublishingStatus = Database["public"]["Enums"]["publishing_status"];

export type SourceRow = Database["public"]["Tables"]["sources"]["Row"];
export type ContentRow = Database["public"]["Tables"]["content"]["Row"];
export type AffiliateLinkRow = Database["public"]["Tables"]["affiliate_links"]["Row"];
export type PublishingJobRow = Database["public"]["Tables"]["publishing_jobs"]["Row"];
export type AnalyticsRow = Database["public"]["Tables"]["analytics"]["Row"];

export const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "tiktok", label: "TikTok" },
];

export const platformLabel = (p: Platform) => PLATFORMS.find((x) => x.value === p)?.label ?? p;

export const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "live_stream", label: "Live Stream" },
  { value: "upload", label: "Upload" },
  { value: "other", label: "Other" },
];

export const PERMISSION_STATUSES: {
  value: PermissionStatus;
  label: string;
  risky: boolean;
}[] = [
  { value: "confirmed_permission", label: "Confirmed permission", risky: false },
  { value: "licensed", label: "Licensed", risky: false },
  { value: "own_content", label: "Own content", risky: false },
  { value: "unknown", label: "Unknown", risky: true },
  { value: "not_allowed", label: "Not allowed", risky: true },
];

export const permissionMeta = (p: PermissionStatus) =>
  PERMISSION_STATUSES.find((x) => x.value === p) ?? {
    value: p,
    label: p,
    risky: true,
  };

export const CONTENT_STATUSES: { value: ContentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_review", label: "Ready for Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
];

export const MANUAL_CONTENT_STATUSES: ContentStatus[] = [
  "draft",
  "processing",
  "ready_for_review",
  "approved",
  "rejected",
  "scheduled",
];

export const contentStatusLabel = (s: ContentStatus) =>
  CONTENT_STATUSES.find((x) => x.value === s)?.label ?? s;

export const PUBLISHING_STATUSES: { value: PublishingStatus; label: string }[] = [
  { value: "waiting", label: "Waiting" },
  { value: "scheduled", label: "Scheduled" },
  { value: "publishing", label: "Publishing" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
];

export const publishingStatusLabel = (s: PublishingStatus) =>
  PUBLISHING_STATUSES.find((x) => x.value === s)?.label ?? s;

export const sourceTypeLabel = (s: SourceType) =>
  SOURCE_TYPES.find((x) => x.value === s)?.label ?? s;
