import { verifyOAuthState } from "./crypto";
import {
  deleteYoutubeCredential,
  decryptRefreshToken,
  getYoutubeAccount,
  getYoutubeCredential,
  upsertYoutubeAccount,
  upsertYoutubeCredential,
} from "./credentials.server";
import { getYouTubeServerConfig, youtubeAppConfigured } from "./env.server";
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  fetchYoutubeChannel,
  revokeGoogleToken,
} from "./google.server";
import type { YouTubeConnectionStatus } from "./public";

function publicError(message: string): Error {
  return new Error(message);
}

export async function getYoutubeConnectionStatus(userId: string): Promise<YouTubeConnectionStatus> {
  const account = await getYoutubeAccount(userId);
  const credential = await getYoutubeCredential(userId);
  return {
    appConfigured: youtubeAppConfigured(),
    connected: Boolean(account?.is_connected && credential),
    channelId: credential?.youtubeChannelId ?? null,
    channelName: account?.account_name ?? null,
  };
}

export async function startYoutubeConnect(userId: string): Promise<{ authorizationUrl: string }> {
  const resolved = getYouTubeServerConfig();
  if (!resolved.ok) {
    throw publicError("YouTube OAuth is not configured on the server.");
  }
  return { authorizationUrl: buildAuthorizationUrl(resolved.config, userId) };
}

export async function disconnectYoutube(userId: string): Promise<void> {
  const encrypted = await deleteYoutubeCredential(userId);
  const resolved = getYouTubeServerConfig();
  if (encrypted && resolved.ok) {
    try {
      const refreshToken = decryptRefreshToken(encrypted, resolved.config);
      await revokeGoogleToken(refreshToken);
    } catch {
      // Revocation is best-effort; local credential removal already succeeded.
    }
  }
  await upsertYoutubeAccount({
    userId,
    connected: false,
    channelName: null,
    channelId: null,
  });
}

export type OAuthCallbackResult = { ok: true } | { ok: false; message: string };

export async function completeYoutubeOAuth(input: {
  code: string | null;
  state: string | null;
  error: string | null;
}): Promise<OAuthCallbackResult> {
  if (input.error) {
    return { ok: false, message: oauthErrorMessage(input.error) };
  }
  if (!input.code || !input.state) {
    return { ok: false, message: "YouTube authorization was incomplete." };
  }

  const resolved = getYouTubeServerConfig();
  if (!resolved.ok) {
    return { ok: false, message: "YouTube OAuth is not configured on the server." };
  }

  let userId: string;
  try {
    userId = verifyOAuthState(input.state, resolved.config.encryptionKey).userId;
  } catch {
    return { ok: false, message: "YouTube authorization expired. Try connecting again." };
  }

  try {
    const tokens = await exchangeAuthorizationCode(resolved.config, input.code);
    const channel = await fetchYoutubeChannel(tokens.access_token);
    const existing = await getYoutubeCredential(userId);
    const refreshToken = tokens.refresh_token
      ? tokens.refresh_token
      : existing
        ? decryptRefreshToken(existing.encryptedRefreshToken, resolved.config)
        : null;
    if (!refreshToken) {
      return {
        ok: false,
        message:
          "Google did not return a refresh token. Disconnect the app in Google Account permissions and try again.",
      };
    }
    const tokenExpiresAt =
      typeof tokens.expires_in === "number"
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;
    await upsertYoutubeCredential({
      userId,
      refreshToken,
      tokenExpiresAt,
      youtubeChannelId: channel.id,
      config: resolved.config,
    });
    await upsertYoutubeAccount({
      userId,
      connected: true,
      channelName: channel.title,
      channelId: channel.id,
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not complete YouTube authorization." };
  }
}

function oauthErrorMessage(error: string): string {
  if (error === "access_denied") return "YouTube authorization was cancelled.";
  return "YouTube authorization failed.";
}
