import { createServerFn } from "@tanstack/react-start";
import { requireYoutubeUser } from "./user-auth";
import type {
  YouTubeConnectResult,
  YouTubeConnectionStatus,
  YouTubeDisconnectResult,
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
