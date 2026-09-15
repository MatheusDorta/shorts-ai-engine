import { createServerFn } from "@tanstack/react-start";
import { requireYoutubeUser } from "./user-auth";
import type {
  YouTubeConnectResult,
  YouTubeConnectionStatus,
  YouTubeDisconnectResult,
  YouTubePublishNowResult,
  YouTubeScheduleResult,
} from "./public";

export const getYoutubeStatus = createServerFn({ method: "GET" })
  .middleware([requireYoutubeUser])
  .handler(async ({ context }): Promise<YouTubeConnectionStatus> => {
    const { getYoutubeConnectionStatus } = await import("./oauth.server");
    return getYoutubeConnectionStatus(context.userId);
  });

export const startYoutubeOAuth = createServerFn({ method: "POST" })
  .middleware([requireYoutubeUser])
  .handler(async ({ context }): Promise<YouTubeConnectResult> => {
    try {
      const { startYoutubeConnect } = await import("./oauth.server");
      const { authorizationUrl } = await startYoutubeConnect(context.userId);
      return { ok: true, authorizationUrl };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not start YouTube connection.";
      if (message.includes("not configured")) {
        return { ok: false, code: "not_configured", message };
      }
      if (message === "Unauthorized") {
        return { ok: false, code: "unauthorized", message };
      }
      return { ok: false, code: "error", message: "Could not start YouTube connection." };
    }
  });

export const disconnectYoutubeAccount = createServerFn({ method: "POST" })
  .middleware([requireYoutubeUser])
  .handler(async ({ context }): Promise<YouTubeDisconnectResult> => {
    try {
      const { disconnectYoutube } = await import("./oauth.server");
      await disconnectYoutube(context.userId);
      return { ok: true };
    } catch {
      return { ok: false, code: "error", message: "Could not disconnect YouTube." };
    }
  });

export const publishYoutubeNow = createServerFn({ method: "POST" })
  .middleware([requireYoutubeUser])
  .validator((data: { contentId: string; jobId?: string }) => {
    if (!data?.contentId || typeof data.contentId !== "string") {
      throw new Error("contentId is required");
    }
    const contentId = data.contentId.trim();
    if (!contentId) throw new Error("contentId is required");
    const jobId = typeof data.jobId === "string" ? data.jobId.trim() : "";
    return jobId ? { contentId, jobId } : { contentId };
  })
  .handler(async ({ context, data }): Promise<YouTubePublishNowResult> => {
    try {
      const { publishYoutubeNow: run } = await import("./publish.server");
      return await run(context.userId, data);
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return { ok: false, code: "unauthorized", message: "Unauthorized" };
      }
      return { ok: false, code: "error", message: "Could not publish to YouTube." };
    }
  });

export const scheduleYoutubePublish = createServerFn({ method: "POST" })
  .middleware([requireYoutubeUser])
  .validator((data: { contentId: string; scheduledAt: string; jobId?: string }) => {
    if (!data?.contentId || typeof data.contentId !== "string") {
      throw new Error("contentId is required");
    }
    const contentId = data.contentId.trim();
    if (!contentId) throw new Error("contentId is required");
    if (!data.scheduledAt || typeof data.scheduledAt !== "string") {
      throw new Error("scheduledAt is required");
    }
    const scheduledAt = data.scheduledAt.trim();
    if (!scheduledAt) throw new Error("scheduledAt is required");
    const jobId = typeof data.jobId === "string" ? data.jobId.trim() : "";
    return jobId ? { contentId, scheduledAt, jobId } : { contentId, scheduledAt };
  })
  .handler(async ({ context, data }): Promise<YouTubeScheduleResult> => {
    try {
      const { scheduleYoutubePublish: run } = await import("./publish.server");
      return await run(context.userId, data);
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return { ok: false, code: "unauthorized", message: "Unauthorized" };
      }
      return { ok: false, code: "error", message: "Could not schedule the YouTube upload." };
    }
  });

export const syncYoutubeScheduledJobs = createServerFn({ method: "POST" })
  .middleware([requireYoutubeUser])
  .handler(async ({ context }): Promise<{ ok: boolean; updated: number }> => {
    try {
      const { syncYoutubeScheduledJobs: run } = await import("./publish.server");
      return await run(context.userId);
    } catch {
      return { ok: false, updated: 0 };
    }
  });
