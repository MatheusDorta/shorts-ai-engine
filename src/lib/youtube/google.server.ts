import { randomBytes } from "node:crypto";
import { signOAuthState, type OAuthStatePayload } from "./crypto";
import type { YouTubeServerConfig } from "./env.server";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
] as const;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export type YouTubeChannel = {
  id: string;
  title: string | null;
};

export type YoutubeUploadedVideo = {
  id: string;
};

export type YoutubeVideoStatus = {
  privacyStatus: string | null;
};

export function buildAuthorizationUrl(config: YouTubeServerConfig, userId: string): string {
  const state = signOAuthState(
    {
      userId,
      nonce: randomBytes(16).toString("hex"),
      exp: Date.now() + 10 * 60 * 1000,
    } satisfies OAuthStatePayload,
    config.encryptionKey,
  );
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text || "request_failed" };
  }
}

function googleErrorMessage(body: Record<string, unknown>, fallback: string): string {
  const error = typeof body["error"] === "string" ? body["error"] : null;
  const description =
    typeof body["error_description"] === "string" ? body["error_description"] : null;
  if (description) return description;
  if (error) return error;
  return fallback;
}

export async function exchangeAuthorizationCode(
  config: YouTubeServerConfig,
  code: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await readJson(response);
  if (!response.ok || typeof payload["access_token"] !== "string") {
    throw new Error(googleErrorMessage(payload, "Could not exchange YouTube authorization code"));
  }
  const tokens: GoogleTokenResponse = { access_token: payload["access_token"] };
  if (typeof payload["refresh_token"] === "string") tokens.refresh_token = payload["refresh_token"];
  if (typeof payload["expires_in"] === "number") tokens.expires_in = payload["expires_in"];
  if (typeof payload["token_type"] === "string") tokens.token_type = payload["token_type"];
  if (typeof payload["scope"] === "string") tokens.scope = payload["scope"];
  return tokens;
}

export async function refreshAccessToken(
  config: YouTubeServerConfig,
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await readJson(response);
  if (!response.ok || typeof payload["access_token"] !== "string") {
    throw new Error(googleErrorMessage(payload, "Could not refresh YouTube access"));
  }
  const tokens: GoogleTokenResponse = { access_token: payload["access_token"] };
  if (typeof payload["refresh_token"] === "string") tokens.refresh_token = payload["refresh_token"];
  if (typeof payload["expires_in"] === "number") tokens.expires_in = payload["expires_in"];
  if (typeof payload["token_type"] === "string") tokens.token_type = payload["token_type"];
  if (typeof payload["scope"] === "string") tokens.scope = payload["scope"];
  return tokens;
}

export async function uploadYoutubeVideo(input: {
  accessToken: string;
  metadata: {
    snippet: {
      title: string;
      description: string;
      tags: string[];
      categoryId: string;
    };
    status: {
      privacyStatus: "private" | "public";
      selfDeclaredMadeForKids: false;
      publishAt?: string;
    };
  };
  bytes: Uint8Array;
  contentType: string;
}): Promise<YoutubeUploadedVideo> {
  const privacyStatus = input.metadata.status.privacyStatus;
  if (privacyStatus !== "private" && privacyStatus !== "public") {
    throw new Error("YouTube uploads must be private or public.");
  }
  if (privacyStatus === "public" && input.metadata.status.publishAt) {
    throw new Error("A public YouTube upload cannot set publishAt.");
  }
  const initUrl = new URL(UPLOAD_URL);
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");
  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(input.bytes.byteLength),
      "X-Upload-Content-Type": input.contentType,
    },
    body: JSON.stringify(input.metadata),
  });
  const uploadUrl = initResponse.headers.get("location");
  if (!initResponse.ok || !uploadUrl) {
    const payload = await readJson(initResponse);
    throw new Error(youtubeApiError(payload, "Could not start YouTube upload"));
  }

  const total = input.bytes.byteLength;
  const chunkSize = 8 * 1024 * 1024;
  let offset = 0;
  while (offset < total) {
    const end = Math.min(offset + chunkSize, total);
    const chunk = input.bytes.subarray(offset, end);
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${offset}-${end - 1}/${total}`,
        "Content-Type": input.contentType,
      },
      body: Buffer.from(chunk),
    });
    if (end < total) {
      if (uploadResponse.status !== 308) {
        const payload = await readJson(uploadResponse);
        throw new Error(youtubeApiError(payload, "YouTube upload was interrupted"));
      }
      offset = end;
      continue;
    }
    const payload = await readJson(uploadResponse);
    if (!uploadResponse.ok || typeof payload["id"] !== "string" || !payload["id"]) {
      throw new Error(youtubeApiError(payload, "YouTube did not confirm the upload"));
    }
    return { id: payload["id"] };
  }
  throw new Error("YouTube did not confirm the upload");
}

function youtubeApiError(body: Record<string, unknown>, fallback: string): string {
  const error = body["error"];
  if (error && typeof error === "object") {
    const details = error as { message?: unknown; errors?: unknown };
    if (typeof details.message === "string" && details.message) return details.message;
  }
  return googleErrorMessage(body, fallback);
}

export async function fetchYoutubeChannel(accessToken: string): Promise<YouTubeChannel> {
  const url = new URL(CHANNELS_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(googleErrorMessage(payload, "Could not read YouTube channel"));
  }
  const items = Array.isArray(payload["items"]) ? payload["items"] : [];
  const first = items[0];
  if (!first || typeof first !== "object") {
    throw new Error("No YouTube channel is associated with this Google account");
  }
  const item = first as { id?: unknown; snippet?: { title?: unknown } };
  if (typeof item.id !== "string" || !item.id) {
    throw new Error("YouTube channel id was missing");
  }
  return {
    id: item.id,
    title: typeof item.snippet?.title === "string" ? item.snippet.title : null,
  };
}

export async function fetchYoutubeVideoStatuses(
  accessToken: string,
  videoIds: string[],
): Promise<Map<string, YoutubeVideoStatus>> {
  const unique = [...new Set(videoIds.filter(Boolean))];
  if (!unique.length) return new Map();
  const url = new URL(VIDEOS_URL);
  url.searchParams.set("part", "status");
  url.searchParams.set("id", unique.join(","));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(googleErrorMessage(payload, "Could not read YouTube video status"));
  }
  const items = Array.isArray(payload["items"]) ? payload["items"] : [];
  const statuses = new Map<string, YoutubeVideoStatus>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { id?: unknown; status?: { privacyStatus?: unknown } };
    if (typeof item.id !== "string" || !item.id) continue;
    statuses.set(item.id, {
      privacyStatus:
        typeof item.status?.privacyStatus === "string" ? item.status.privacyStatus : null,
    });
  }
  return statuses;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  const body = new URLSearchParams({ token });
  const response = await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok && response.status !== 400) {
    throw new Error("Could not revoke YouTube access");
  }
}
