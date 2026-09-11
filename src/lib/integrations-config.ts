/**
 * Central integration configuration layer.
 *
 * SECURITY: no API keys, client secrets or OAuth tokens ever live in this file
 * or anywhere in client-side code. This module only exposes non-secret flags
 * that tell the UI whether a server-side integration has been configured at
 * the application level.
 *
 * Application configuration (Google OAuth client exists on the server) is
 * separate from user-specific connection state. A user's YouTube account is
 * connected only when platform_accounts.is_connected is true for that user.
 * Never treat `configured` below as proof that the current user is connected.
 *
 * When an integration is implemented, its credentials are stored as backend
 * secrets and read only inside server functions / server routes.
 */

export interface IntegrationDescriptor {
  key: string;
  name: string;
  apiName: string;
  /**
   * Client-safe default for whether this app's OAuth client is known to exist.
   * The live value for YouTube is returned by the server as `appConfigured`.
   */
  configured: boolean;
  /** Non-secret env var names the server side needs. Never prefix these with VITE_. */
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
      "PLATFORM_CREDENTIALS_ENCRYPTION_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    docsUrl: "https://developers.google.com/youtube/v3/docs/videos/insert",
  },
  tiktok: {
    key: "tiktok",
    name: "TikTok",
    apiName: "TikTok Content Posting API",
    configured: false,
    requiredServerSecrets: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"],
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
  },
};

export const integrationList = Object.values(integrationConfig);

export const STORAGE_BUCKET = "media";
export const SIGNED_URL_TTL_SECONDS = 60 * 60;
