/**
 * Central integration configuration layer.
 *
 * SECURITY: no API keys, client secrets or OAuth tokens ever live in this file
 * or anywhere in client-side code. This module only exposes non-secret flags
 * that tell the UI whether a server-side integration has been configured.
 *
 * When an integration is implemented, its credentials are stored as backend
 * secrets and read only inside server functions / server routes. Flipping a
 * flag below to `true` requires that server-side work to exist first.
 */

export interface IntegrationDescriptor {
  key: string;
  name: string;
  apiName: string;
  /** True only once server-side OAuth credentials are in place. */
  configured: boolean;
  /** Non-secret env var names the server side will need later. */
  requiredServerSecrets: string[];
  docsUrl: string;
}

export const integrationConfig: {
  youtube: IntegrationDescriptor;
  tiktok: IntegrationDescriptor;
} = {
  youtube: {
    key: "youtube_shorts",
    name: "YouTube Shorts",
    apiName: "YouTube Data API v3",
    configured: false,
    requiredServerSecrets: [
      "YOUTUBE_CLIENT_ID",
      "YOUTUBE_CLIENT_SECRET",
      "YOUTUBE_REDIRECT_URI",
    ],
    docsUrl: "https://developers.google.com/youtube/v3/docs/videos/insert",
  },
  tiktok: {
    key: "tiktok",
    name: "TikTok",
    apiName: "TikTok Content Posting API",
    configured: false,
    requiredServerSecrets: [
      "TIKTOK_CLIENT_KEY",
      "TIKTOK_CLIENT_SECRET",
      "TIKTOK_REDIRECT_URI",
    ],
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
  },
};

export const integrationList = Object.values(integrationConfig);

export const STORAGE_BUCKET = "media";
export const SIGNED_URL_TTL_SECONDS = 60 * 60;
