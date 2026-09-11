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
