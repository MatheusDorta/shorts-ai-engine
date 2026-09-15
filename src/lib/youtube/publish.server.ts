import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { STORAGE_BUCKET } from "@/lib/integrations-config";
import {
  decryptRefreshToken,
  getYoutubeAccount,
  getYoutubeCredential,
  upsertYoutubeCredential,
  type StoredYouTubeCredential,
} from "./credentials.server";
import { getYouTubeServerConfig, type YouTubeServerConfig } from "./env.server";
import {
  fetchYoutubeVideoStatuses,
  refreshAccessToken,
  uploadYoutubeVideo,
  type YoutubeUploadedVideo,
} from "./google.server";
import { assertOwnedMediaPath, guessVideoContentType } from "./media-path";
import { buildYoutubeVideoMetadata, youtubeWatchUrl } from "./publish-metadata";
import { normalizeScheduledAt } from "./schedule-time";
import type { YouTubePublishNowResult, YouTubeScheduleResult } from "./public";

const PLATFORM = "youtube_shorts" as const;
const ACTIVE_JOB_STATUSES = ["waiting", "scheduled", "publishing"] as const;
const PUBLISHABLE_CONTENT_STATUSES = ["approved", "scheduled"] as const;

export type { YouTubePublishNowResult, YouTubeScheduleResult };

type ContentRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  hashtags: string[];
  video_path: string | null;
  status: string;
  source_id: string | null;
};

type JobRow = {
  id: string;
  user_id: string;
  content_id: string;
  platform: typeof PLATFORM;
  status: string;
  remote_id?: string | null;
};

function publicMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && !looksSecret(error.message)) {
    return error.message;
  }
  return fallback;
}

function looksSecret(message: string): boolean {
  return /refresh_token|access_token|client_secret|service.role|sb_secret_|Bearer /i.test(message);
}

async function failJob(jobId: string, message: string): Promise<void> {
  await supabaseAdmin
    .from("publishing_jobs")
    .update({
      status: "failed",
      error_message: message,
      result: "YouTube upload failed. Content was not published.",
    })
    .eq("id", jobId)
    .eq("status", "publishing");
}

async function downloadOwnedVideo(userId: string, videoPath: string) {
  const path = assertOwnedMediaPath(userId, videoPath);
  const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).download(path);
  if (error || !data) {
    throw new Error("Could not read the private video from storage.");
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (!bytes.byteLength) {
    throw new Error("The stored video file is empty.");
  }
  return { bytes, contentType: guessVideoContentType(path) };
}

async function withFreshAccessToken<T>(
  userId: string,
  credential: StoredYouTubeCredential,
  config: YouTubeServerConfig,
  run: (accessToken: string) => Promise<T>,
): Promise<T> {
  const refreshToken = decryptRefreshToken(credential.encryptedRefreshToken, config);
  const tokens = await refreshAccessToken(config, refreshToken);
  if (tokens.refresh_token && credential.youtubeChannelId) {
    const tokenExpiresAt =
      typeof tokens.expires_in === "number"
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : credential.tokenExpiresAt;
    await upsertYoutubeCredential({
      userId,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt,
      youtubeChannelId: credential.youtubeChannelId,
      config,
    });
  }
  return run(tokens.access_token);
}

async function downloadAndUpload(input: {
  userId: string;
  credential: StoredYouTubeCredential;
  config: YouTubeServerConfig;
  content: ContentRow;
  privacyStatus: "private" | "public";
  publishAt: string | null;
}): Promise<YoutubeUploadedVideo> {
  const video = await downloadOwnedVideo(input.userId, input.content.video_path!);
  return withFreshAccessToken(input.userId, input.credential, input.config, (accessToken) =>
    uploadYoutubeVideo({
      accessToken,
      metadata: buildYoutubeVideoMetadata({
        title: input.content.title,
        description: input.content.description,
        hashtags: input.content.hashtags,
        privacyStatus: input.privacyStatus,
        publishAt: input.publishAt,
      }),
      bytes: video.bytes,
      contentType: video.contentType,
    }),
  );
}

async function loadPublishableContent(userId: string, contentId: string): Promise<ContentRow> {
  const { data, error } = await supabaseAdmin
    .from("content")
    .select("id,user_id,title,description,hashtags,video_path,status,source_id")
    .eq("id", contentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Content not found.");
  const publishable = PUBLISHABLE_CONTENT_STATUSES as readonly string[];
  if (!publishable.includes(data.status)) {
    throw new Error("Only approved content can be published to YouTube.");
  }
  if (!data.video_path) {
    throw new Error("Upload a video before publishing to YouTube.");
  }
  if (data.source_id) {
    const source = await supabaseAdmin
      .from("sources")
      .select("permission_status")
      .eq("id", data.source_id)
      .maybeSingle();
    if (source.error) throw source.error;
    if (source.data?.permission_status === "not_allowed") {
      throw new Error("Content cannot use a source marked not allowed.");
    }
  }
  const platform = await supabaseAdmin
    .from("content_platforms")
    .select("platform")
    .eq("content_id", contentId)
    .eq("user_id", userId)
    .eq("platform", PLATFORM)
    .maybeSingle();
  if (platform.error) throw platform.error;
  if (!platform.data) {
    throw new Error("YouTube Shorts is not selected for this content.");
  }
  return data;
}

async function claimJob(jobId: string, userId: string, contentId: string): Promise<JobRow> {
  const claimed = await supabaseAdmin
    .from("publishing_jobs")
    .update({
      status: "publishing",
      error_message: null,
      result: "Uploading privately to YouTube.",
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("platform", PLATFORM)
    .in("status", ["waiting", "scheduled", "failed"])
    .select("id,user_id,content_id,platform,status,remote_id")
    .maybeSingle();
  if (claimed.error) throw claimed.error;
  if (!claimed.data) {
    throw new Error("This job cannot be published right now.");
  }
  return claimed.data as JobRow;
}

async function claimOrCreateJob(
  userId: string,
  contentId: string,
  jobId?: string,
): Promise<JobRow> {
  if (jobId) return claimJob(jobId, userId, contentId);

  const existing = await supabaseAdmin
    .from("publishing_jobs")
    .select("id,user_id,content_id,platform,status,remote_id")
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("platform", PLATFORM)
    .in("status", [...ACTIVE_JOB_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    if (existing.data.status === "publishing") {
      throw new Error("A YouTube upload is already in progress for this content.");
    }
    if (existing.data.remote_id) {
      throw new Error("This content is already uploaded to YouTube.");
    }
    return claimJob(existing.data.id, userId, contentId);
  }

  const failed = await supabaseAdmin
    .from("publishing_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("platform", PLATFORM)
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (failed.error) throw failed.error;
  if (failed.data) return claimJob(failed.data.id, userId, contentId);

  const inserted = await supabaseAdmin
    .from("publishing_jobs")
    .insert({
      user_id: userId,
      content_id: contentId,
      platform: PLATFORM,
      status: "publishing",
      result: "Uploading privately to YouTube.",
      error_message: null,
    })
    .select("id,user_id,content_id,platform,status,remote_id")
    .single();
  if (inserted.error) throw inserted.error;

  const active = await supabaseAdmin
    .from("publishing_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("platform", PLATFORM)
    .in("status", [...ACTIVE_JOB_STATUSES]);
  if (active.error) throw active.error;
  if ((active.data?.length ?? 0) > 1) {
    await failJob(inserted.data.id, "A YouTube upload is already in progress for this content.");
    throw new Error("A YouTube upload is already in progress for this content.");
  }
  return inserted.data as JobRow;
}

/**
 * Claim a job for a YouTube schedule. Re-scheduling an existing active upload is
 * refused because updating publishAt of an already uploaded video is out of scope
 * for the upload-only OAuth scopes.
 */
async function claimJobForSchedule(
  userId: string,
  contentId: string,
  jobId?: string,
): Promise<JobRow> {
  if (jobId) return claimJob(jobId, userId, contentId);

  const existing = await supabaseAdmin
    .from("publishing_jobs")
    .select("id,user_id,content_id,platform,status,remote_id")
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("platform", PLATFORM)
    .in("status", [...ACTIVE_JOB_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    if (existing.data.status === "publishing") {
      throw new Error("A YouTube upload is already in progress for this content.");
    }
    throw new Error(
      "This content already has an active YouTube job. Cancel or wait for it before scheduling again.",
    );
  }

  const failed = await supabaseAdmin
    .from("publishing_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("content_id", contentId)
    .eq("platform", PLATFORM)
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (failed.error) throw failed.error;
  if (failed.data) return claimJob(failed.data.id, userId, contentId);

  const inserted = await supabaseAdmin
    .from("publishing_jobs")
    .insert({
      user_id: userId,
      content_id: contentId,
      platform: PLATFORM,
      status: "publishing",
      result: "Uploading privately to YouTube.",
      error_message: null,
    })
    .select("id,user_id,content_id,platform,status,remote_id")
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data as JobRow;
}

export async function publishYoutubeNow(
  userId: string,
  input: { contentId: string; jobId?: string },
): Promise<YouTubePublishNowResult> {
  const resolved = getYouTubeServerConfig();
  if (!resolved.ok) {
    return {
      ok: false,
      code: "not_configured",
      message: "YouTube OAuth is not configured on the server.",
    };
  }

  const account = await getYoutubeAccount(userId);
  const credential = await getYoutubeCredential(userId);
  if (!account?.is_connected || !credential) {
    return { ok: false, code: "error", message: "Connect YouTube before publishing." };
  }

  let job: JobRow | null = null;
  let uploadedId: string | null = null;
  try {
    const content = await loadPublishableContent(userId, input.contentId);
    job = await claimOrCreateJob(userId, input.contentId, input.jobId);
    const uploaded = await downloadAndUpload({
      userId,
      credential,
      config: resolved.config,
      content,
      privacyStatus: "public",
      publishAt: null,
    });
    uploadedId = uploaded.id;
    const videoUrl = youtubeWatchUrl(uploaded.id);
    const publishedAt = new Date().toISOString();

    const published = await supabaseAdmin
      .from("publishing_jobs")
      .update({
        status: "published",
        published_at: publishedAt,
        remote_id: uploaded.id,
        remote_url: videoUrl,
        error_message: null,
        result: `Published publicly on YouTube (${uploaded.id}).`,
      })
      .eq("id", job.id)
      .eq("user_id", userId)
      .eq("status", "publishing")
      .select("id")
      .maybeSingle();
    if (published.error) throw published.error;
    if (published.data) {
      await supabaseAdmin
        .from("content")
        .update({ status: "published" })
        .eq("id", input.contentId)
        .eq("user_id", userId);
    }

    return {
      ok: true,
      jobId: job.id,
      videoId: uploaded.id,
      videoUrl,
      privacyStatus: "public",
    };
  } catch (error) {
    if (uploadedId && job) {
      return {
        ok: true,
        jobId: job.id,
        videoId: uploadedId,
        videoUrl: youtubeWatchUrl(uploadedId),
        privacyStatus: "public",
      };
    }
    const message = publicMessage(error, "Could not publish to YouTube.");
    if (job) {
      try {
        await failJob(job.id, message);
      } catch {
        // Job failure write is best-effort after the user-facing error is already known.
      }
    }
    return { ok: false, code: "error", message };
  }
}

export async function scheduleYoutubePublish(
  userId: string,
  input: { contentId: string; scheduledAt: string; jobId?: string },
): Promise<YouTubeScheduleResult> {
  const resolved = getYouTubeServerConfig();
  if (!resolved.ok) {
    return {
      ok: false,
      code: "not_configured",
      message: "YouTube OAuth is not configured on the server.",
    };
  }

  const account = await getYoutubeAccount(userId);
  const credential = await getYoutubeCredential(userId);
  if (!account?.is_connected || !credential) {
    return { ok: false, code: "error", message: "Connect YouTube before scheduling." };
  }

  let job: JobRow | null = null;
  let uploadedId: string | null = null;
  let publishAt: string | null = null;
  try {
    const content = await loadPublishableContent(userId, input.contentId);
    publishAt = normalizeScheduledAt(input.scheduledAt, Date.now());
    job = await claimJobForSchedule(userId, input.contentId, input.jobId);
    const uploaded = await downloadAndUpload({
      userId,
      credential,
      config: resolved.config,
      content,
      privacyStatus: "private",
      publishAt,
    });
    uploadedId = uploaded.id;
    const videoUrl = youtubeWatchUrl(uploaded.id);

    const updated = await supabaseAdmin
      .from("publishing_jobs")
      .update({
        status: "scheduled",
        scheduled_at: publishAt,
        remote_id: uploaded.id,
        remote_url: videoUrl,
        error_message: null,
        result: `Uploaded privately to YouTube and set to publish automatically at ${publishAt}.`,
      })
      .eq("id", job.id)
      .eq("user_id", userId)
      .eq("status", "publishing")
      .select("id")
      .maybeSingle();
    if (updated.error) throw updated.error;
    if (updated.data) {
      await supabaseAdmin
        .from("content")
        .update({ status: "scheduled", scheduled_at: publishAt })
        .eq("id", input.contentId)
        .eq("user_id", userId);
    }

    return {
      ok: true,
      jobId: job.id,
      videoId: uploaded.id,
      videoUrl,
      privacyStatus: "private",
      publishAt,
    };
  } catch (error) {
    if (uploadedId && job) {
      try {
        await supabaseAdmin
          .from("publishing_jobs")
          .update({
            status: "scheduled",
            scheduled_at: publishAt,
            remote_id: uploadedId,
            remote_url: youtubeWatchUrl(uploadedId),
            result: "Uploaded to YouTube. Local status update failed; refresh the queue.",
          })
          .eq("id", job.id)
          .eq("user_id", userId);
      } catch {
        // Best effort: the upload already succeeded, so never report a hard failure.
      }
      return {
        ok: true,
        jobId: job.id,
        videoId: uploadedId,
        videoUrl: youtubeWatchUrl(uploadedId),
        privacyStatus: "private",
        publishAt: publishAt ?? new Date().toISOString(),
      };
    }
    const message = publicMessage(error, "Could not schedule the YouTube upload.");
    if (job) {
      try {
        await failJob(job.id, message);
      } catch {
        // Job failure write is best-effort after the user-facing error is already known.
      }
    }
    return { ok: false, code: "error", message };
  }
}

/**
 * Lazy reconciliation: mark scheduled YouTube uploads as published once YouTube has
 * actually made them public at the scheduled time. No cron or worker is involved.
 */
export async function syncYoutubeScheduledJobs(
  userId: string,
): Promise<{ ok: true; updated: number } | { ok: false; updated: 0 }> {
  const resolved = getYouTubeServerConfig();
  if (!resolved.ok) return { ok: false, updated: 0 };

  const due = await supabaseAdmin
    .from("publishing_jobs")
    .select("id,content_id,remote_id")
    .eq("user_id", userId)
    .eq("platform", PLATFORM)
    .eq("status", "scheduled")
    .not("remote_id", "is", null)
    .lte("scheduled_at", new Date().toISOString());
  if (due.error) throw due.error;
  if (!due.data?.length) return { ok: true, updated: 0 };

  const credential = await getYoutubeCredential(userId);
  if (!credential) return { ok: true, updated: 0 };

  const refreshToken = decryptRefreshToken(credential.encryptedRefreshToken, resolved.config);
  const tokens = await refreshAccessToken(resolved.config, refreshToken);
  const statuses = await fetchYoutubeVideoStatuses(
    tokens.access_token,
    due.data.map((job) => job.remote_id ?? "").filter(Boolean),
  );

  let updated = 0;
  for (const job of due.data) {
    if (!job.remote_id) continue;
    if (statuses.get(job.remote_id)?.privacyStatus !== "public") continue;
    const publishedAt = new Date().toISOString();
    const result = await supabaseAdmin
      .from("publishing_jobs")
      .update({
        status: "published",
        published_at: publishedAt,
        result: `Published publicly on YouTube (${job.remote_id}).`,
      })
      .eq("id", job.id)
      .eq("user_id", userId)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (result.error) continue;
    if (result.data) {
      await supabaseAdmin
        .from("content")
        .update({ status: "published" })
        .eq("id", job.content_id)
        .eq("user_id", userId);
      updated += 1;
    }
  }
  return { ok: true, updated };
}
