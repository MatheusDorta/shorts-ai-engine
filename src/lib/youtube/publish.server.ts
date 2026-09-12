import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { STORAGE_BUCKET } from "@/lib/integrations-config";
import {
  decryptRefreshToken,
  getYoutubeAccount,
  getYoutubeCredential,
  upsertYoutubeCredential,
} from "./credentials.server";
import { getYouTubeServerConfig } from "./env.server";
import { refreshAccessToken, uploadYoutubeVideo } from "./google.server";
import { assertOwnedMediaPath, guessVideoContentType } from "./media-path";
import { buildYoutubeVideoMetadata, youtubeWatchUrl } from "./publish-metadata";

const PLATFORM = "youtube_shorts" as const;
const ACTIVE_JOB_STATUSES = ["waiting", "scheduled", "publishing"] as const;
const PUBLISHABLE_CONTENT_STATUSES = ["approved", "scheduled"] as const;

export type YoutubePublishNowResult =
  | {
      ok: true;
      jobId: string;
      videoId: string;
      videoUrl: string;
      privacyStatus: "private";
    }
  | { ok: false; code: "unauthorized" | "not_configured" | "error"; message: string };

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
    .select("id,user_id,content_id,platform,status")
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
    .select("id,user_id,content_id,platform,status")
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
    .select("id,user_id,content_id,platform,status")
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

export async function publishYoutubeNow(
  userId: string,
  input: { contentId: string; jobId?: string },
): Promise<YoutubePublishNowResult> {
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
    const refreshToken = decryptRefreshToken(credential.encryptedRefreshToken, resolved.config);
    const tokens = await refreshAccessToken(resolved.config, refreshToken);
    const tokenExpiresAt =
      typeof tokens.expires_in === "number"
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : credential.tokenExpiresAt;
    if (tokens.refresh_token && credential.youtubeChannelId) {
      await upsertYoutubeCredential({
        userId,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
        youtubeChannelId: credential.youtubeChannelId,
        config: resolved.config,
      });
    }

    const video = await downloadOwnedVideo(userId, content.video_path!);
    const uploaded = await uploadYoutubeVideo({
      accessToken: tokens.access_token,
      metadata: buildYoutubeVideoMetadata({
        title: content.title,
        description: content.description,
        hashtags: content.hashtags,
      }),
      bytes: video.bytes,
      contentType: video.contentType,
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
        result: `Published privately to YouTube (${uploaded.id}).`,
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
      privacyStatus: "private",
    };
  } catch (error) {
    if (uploadedId && job) {
      return {
        ok: true,
        jobId: job.id,
        videoId: uploadedId,
        videoUrl: youtubeWatchUrl(uploadedId),
        privacyStatus: "private",
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
